import { AxiosRequestConfig, isAxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import {
  ElasticQueryDto,
  OpenSearchBool,
  OpenSearchOperator,
  OpenSearchTerms,
  OpenSearchWildcard,
  TypeSort,
} from './dto/elastic-query.dto';
import { ElasticResponse } from './dto/elastic-response.dto';
import { forkJoin, lastValueFrom } from 'rxjs';
import {
  ElasticOperationDto,
  ElasticOperationEnum,
} from './dto/elastic-operation.dto';
import { SchemaOpenSearch } from './dto/opensearch-schema';
import {
  PaginatedResponse,
  PaginationOptions,
  PropertyDescriptor,
  SearchFields,
} from './types/base-open-search.types';
import { BaseApi } from './base-api';
import { CgiarAppConfig } from '../shared/utils/cgiar-app-config.util';
import { OpenSearchMetadataName } from './decorators/opensearch-property.decorator';
import { PRIMARY_KEY } from '../shared/const/primary-keys.const';

export abstract class BaseOpenSearchApi<
  OpenSearchEntity extends { [PRIMARY_KEY]: number },
> extends BaseApi {
  protected readonly OPENSEARCH_MAX_UPLOAD_SIZE = 1024 * 1024;
  protected readonly _bulkElasticUrl = `_bulk`;
  protected readonly _primaryKey: keyof OpenSearchEntity;
  protected readonly _index: string;
  protected _config: AxiosRequestConfig;
  constructor(
    protected readonly httpService: HttpService,
    protected readonly _env: CgiarAppConfig,
    customPrimaryKey?: string,
    private readonly _openSearchEntity?: new () => OpenSearchEntity,
  ) {
    super(
      httpService,
      _env.openSearchUrl,
      BaseOpenSearchApi.name,
      _env.openSearchUser,
      _env.openSearchPass,
    );
    this._config = <Readonly<AxiosRequestConfig>>{
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${_env.openSearchUser}:${_env.openSearchPass}`,
        ).toString('base64')}`,
        'Content-Type': 'application/x-ndjson',
      },
    };
    if (customPrimaryKey) {
      this._primaryKey = customPrimaryKey as keyof OpenSearchEntity;
    } else {
      this._primaryKey = PRIMARY_KEY as keyof OpenSearchEntity;
    }
    this._index = `${this._env.openSearchBaseIndex}`;
  }

  async uploadSingleToOpenSearch(
    data: Partial<OpenSearchEntity>,
    method: ElasticOperationEnum = ElasticOperationEnum.PATCH,
  ): Promise<void> {
    const promise = Promise.resolve([
      this.getSingleElasticOperation(
        this._index,
        new ElasticOperationDto(method, data),
        true,
      ),
    ]);

    return promise
      .then((elasticData) => this.sendBulkOperationToOpenSearch(elasticData))
      .then(() => {
        this.logger.log(
          `${data[this._primaryKey as string]} has been uploaded to OpenSearch`,
        );
      })
      .catch((error) => {
        this.logger.error(error);
      });
  }

  async uploadToOpenSearch(data: OpenSearchEntity[]): Promise<void> {
    const promise = Promise.resolve(
      this.getBulkElasticOperation(
        this._index,
        data.map(
          (i) => new ElasticOperationDto(ElasticOperationEnum.PATCH, i),
        ) as ElasticOperationDto<OpenSearchEntity>[],
      ),
    );

    return promise
      .then((elasticData) => this.sendBulkOperationToOpenSearch(elasticData))
      .then(() => {
        this.logger.log(`The full dataset has been uploaded to OpenSearch`);
      })
      .catch((error) => {
        this.logger.error(error);
      });
  }

  /**
   * Sends bulk operations request to OpenSearch.
   *
   * This function performs the following steps:
   * 1. Converts the provided data into a format suitable for a bulk operation in OpenSearch.
   * 2. Sends the bulk operation request to the OpenSearch server.
   *
   * @param {string[]} bulkOperationsJson - An array of JSON strings representing the bulk operations to be performed.
   * @returns {Promise<any>} A promise that resolves with the response from the OpenSearch server.
   */
  public async sendBulkOperationToOpenSearch(
    bulkOperationsJson: string[],
  ): Promise<any> {
    const allRequests = bulkOperationsJson.map((op) =>
      this.postRequest(this._bulkElasticUrl, op, this._config),
    );

    return lastValueFrom(forkJoin(allRequests));
  }

  public getSingleElasticOperation(
    documentName: string,
    operation: ElasticOperationDto<OpenSearchEntity>,
    fromBulk = false,
  ): string {
    const isDelete: boolean = operation.operation === 'DELETE';
    function setOperation() {
      switch (operation.operation) {
        case 'PATCH':
          return 'index';
        case 'DELETE':
          return 'delete';
        case 'PUT':
        default:
          return 'update';
      }
    }

    let dataToSave: unknown;
    if (operation.operation === ElasticOperationEnum.PUT) {
      dataToSave = {
        doc: operation.data,
      };
    } else {
      dataToSave = operation.data;
    }

    let elasticOperation = `{ "${setOperation()}" : { "_index" : "${documentName}", "_id" : "${
      operation.data[this._primaryKey as string]
    }"  } }\n${!isDelete ? JSON.stringify(dataToSave) : ''}`;
    if (fromBulk) {
      elasticOperation = elasticOperation.concat('\n');
    }

    return elasticOperation;
  }

  /**
   * Resets the data in the OpenSearch index specified by `env.OPENSEARCH_DOCUMENT_NAME`.
   *
   * This function performs the following steps:
   * 1. Fetches all data from the system.
   * 2. Deletes the existing OpenSearch index.
   * 3. Recreates the index.
   * 4. Sends the previously retrieved data back to the newly created index.
   *
   * @returns {Promise<void>} A promise that resolves when the reset operation is complete.
   */
  async resetElasticData(data: OpenSearchEntity[]): Promise<string | void> {
    const now = new Date();
    const opensearchSchema =
      this._openSearchEntity != undefined ? this._getMappingForSchema() : null;
    await lastValueFrom(this.deleteRequest(`${this._index}`, this._config));
    await lastValueFrom(
      this.putRequest(`${this._index}`, opensearchSchema, this._config),
    );

    const operations: ElasticOperationDto<OpenSearchEntity>[] = data.map(
      (r) => new ElasticOperationDto(ElasticOperationEnum.PATCH, r),
    ) as ElasticOperationDto<OpenSearchEntity>[];

    const elasticJson: string[] = this.getBulkElasticOperation(
      this._index,
      operations,
    );
    return this.sendBulkOperationToOpenSearch(elasticJson)
      .then(
        () =>
          `The data has been reset. Took ${new Date().getTime() - now.getTime()} ms`,
      )
      .catch((error) => {
        this.logger.error(error);
      });
  }

  public getBulkElasticOperation(
    documentName: string,
    operations: ElasticOperationDto<OpenSearchEntity>[],
  ): string[] {
    const bulkElasticOperations: string[] = [];
    let currentBatchElasticOperations = '';
    let currentBatchElasticOperationSize = 0;
    const encoder = new TextEncoder();

    for (const [index, currentOperation] of operations.entries()) {
      const elasticOperation = this.getSingleElasticOperation(
        documentName,
        currentOperation,
        true,
      );

      /*
        we need to encode the operation string to get the accurrate
        byte size, as a simple string length will not work for
        multi-byte characters like emojis or special characters
        in other languages
      */
      const currentEncodedOperation = encoder.encode(elasticOperation);

      /*
        we will cut off the batch if we are at the last operation,
        or if the current operation is going to make the current batch
        larger than the max upload size
        (the +1 is an additional byte for the newline character,
        required by elastic search when bulk uploading)
       */
      if (
        currentBatchElasticOperationSize + currentEncodedOperation.length + 1 >
          this.OPENSEARCH_MAX_UPLOAD_SIZE ||
        (index === operations.length - 1 && currentBatchElasticOperations)
      ) {
        currentBatchElasticOperations =
          currentBatchElasticOperations.concat('\n');
        bulkElasticOperations.push(currentBatchElasticOperations);
        currentBatchElasticOperations = '';
        currentBatchElasticOperationSize = 0;
      }

      currentBatchElasticOperations += elasticOperation;
      currentBatchElasticOperationSize += currentEncodedOperation.length;
    }

    currentBatchElasticOperations = currentBatchElasticOperations.concat('\n');
    bulkElasticOperations.push(currentBatchElasticOperations);

    return bulkElasticOperations;
  }

  private _getMappingForSchema() {
    const properties: PropertyDescriptor[] =
      Reflect.getMetadata(
        OpenSearchMetadataName,
        this._openSearchEntity as object,
      ) ?? [];
    const schema: SchemaOpenSearch<OpenSearchEntity> = {
      mappings: {
        dynamic: true,
        properties: {},
      },
    };

    for (const { propertyKey, options } of properties) {
      const propertyType: any = {};
      if (options?.type) {
        propertyType.type = options.type;
        if (options.nestedType) {
          propertyType['properties'] = this._iterateProperties(
            options.nestedType,
          );
        }
        schema.mappings.properties[propertyKey] = propertyType;
      }

      if (options?.fielddata !== undefined) {
        propertyType.fielddata = options.fielddata;
      }
    }

    return schema;
  }

  private _iterateProperties(opensearchObject?: new () => unknown) {
    const properties: PropertyDescriptor[] =
      Reflect.getMetadata(OpenSearchMetadataName, opensearchObject as object) ??
      [];
    const schema = {};
    for (const { propertyKey, options } of properties) {
      if (options?.type) {
        const propertyType = {
          type: options.type,
        };
        if (
          options.nestedType &&
          opensearchObject?.name !== options.nestedType.name
        ) {
          propertyType['properties'] = this._iterateProperties(
            options.nestedType,
          );
        }
        schema[propertyKey] = propertyType;
      }
    }
    return schema;
  }

  async getAllDataPaginated(
    options: PaginationOptions = {},
  ): Promise<PaginatedResponse<OpenSearchEntity>> {
    const {
      pageSize = 10000,
      searchAfter,
      sortField = this._primaryKey as string,
      sortOrder = 'asc',
      lastModifiedDate,
    } = options;

    // Build the query based on whether we have a date filter
    let queryClause: any;

    if (lastModifiedDate) {
      // If date is provided, filter for documents with @last_modified >= lastModifiedDate
      queryClause = {
        range: {
          '@last_modified': {
            gte: lastModifiedDate,
          },
        },
      };
    } else {
      // If no date, get all documents
      queryClause = {
        match_all: {},
      };
    }

    const query: any = {
      size: pageSize,
      query: queryClause,
      sort: [
        {
          [sortField]: {
            order: sortOrder,
          },
        },
      ],
    };

    // Add search_after for pagination if provided
    if (searchAfter && searchAfter.length > 0) {
      query.search_after = searchAfter;
    }

    try {
      const response = await lastValueFrom(
        this.postRequest<any, ElasticResponse<OpenSearchEntity>>(
          `${this._index}/_search`,
          query,
          this._config,
        ),
      );

      if (!response?.data) {
        throw new Error('No response data received from OpenSearch');
      }

      const hits = response.data.hits.hits;
      const data = hits.map((hit) => hit._source);
      const totalResults = response.data.hits.total.value;

      // Get the sort values from the last document for next page
      const lastHit = hits[hits.length - 1];
      const nextSearchAfter = lastHit?.sort;

      return {
        data,
        pagination: {
          currentPage: searchAfter
            ? Math.floor(searchAfter[0] / pageSize) + 1
            : 1,
          pageSize,
          totalResults,
          hasMore: data.length === pageSize && data.length > 0,
          searchAfter: nextSearchAfter,
        },
      };
    } catch (error) {
      const errorData = isAxiosError(error)
        ? error.response?.data
        : error.message;
      this.logger.error('Error in getAllDataPaginated:', errorData);
      throw new Error(`Failed to fetch paginated data: ${errorData}`);
    }
  }

  async search(
    query: string,
    fieldsToSearchOn: SearchFields<OpenSearchEntity>,
    fieldsToSortOn: TypeSort<OpenSearchEntity>[],
    size: number = 20,
    filter?: string,
    fieldToFilterOn?: keyof OpenSearchEntity,
  ): Promise<(OpenSearchEntity & { score: number })[] | undefined> {
    const listOfFieldsToSearch = this._getDeepKeys(fieldsToSearchOn);
    const elasticQuery = this._getElasticQuery<OpenSearchEntity>(
      query,
      size,
      listOfFieldsToSearch,
      fieldsToSortOn,
      filter,
      fieldToFilterOn,
    );

    return lastValueFrom(
      this.postRequest<
        ElasticQueryDto<OpenSearchEntity>,
        ElasticResponse<OpenSearchEntity>
      >(`${this._index}/_search`, elasticQuery, this._config),
    )
      .then((response) => {
        return response?.data?.hits?.hits?.map((hit) => ({
          ...hit._source,
          score: hit._score,
        }));
      })
      .catch((error: Error) => {
        const data = isAxiosError(error) ? error.response?.data : error.message;
        this.logger.error(data);
        throw new Error(data);
      });
  }

  /**
   * Generates an ElasticQueryDto based on the provided parameters.
   *
   * @template T - The type of the data to be queried.
   * @param {string} toFind - The string to search for.
   * @param {Array<keyof T>} fieldsToSearchOn - The fields to search on.
   * @param {Array<TypeSort<T>>} fieldsToSortOn - The fields to sort on.
   * @returns {ElasticQueryDto<T>} - The generated ElasticQueryDto.
   */
  protected _getElasticQuery<T>(
    toFind: string,
    size: number,
    fieldsToSearchOn: string[],
    fieldsToSortOn: TypeSort<T>[],
    toFilter?: string,
    fieldToFilterOn?: keyof T,
  ): ElasticQueryDto<T> {
    const query: ElasticQueryDto<T> = {
      size,
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    multi_match: {
                      query: toFind,
                      fields: fieldsToSearchOn as (keyof T)[],
                      operator: 'and',
                    },
                  },
                ],
              },
            },
          ],
          filter: [],
        },
      },
      sort: [{ _score: { order: 'desc' } }, ...fieldsToSortOn],
    };
    const individualKeywords = toFind.split(/\s+/);

    if (toFilter && fieldToFilterOn) {
      (query.query.bool as OpenSearchBool<T>).filter = [
        {
          term: {
            [fieldToFilterOn]: toFilter,
          } as OpenSearchTerms<T>,
        },
      ];
    }

    const wildcardQueries = fieldsToSearchOn.flatMap((field) =>
      individualKeywords.map((keyword) => {
        const wildcardQuery: OpenSearchOperator<T> = {
          wildcard: {
            [field]: `*${keyword}*`,
          } as OpenSearchWildcard<T>,
        };
        return wildcardQuery;
      }),
    );

    //icky but necessary
    (query as any).query.bool.must[0].bool.should.push(...wildcardQueries);

    return query;
  }

  private _getDeepKeys(data: any, prefix: string = ''): string[] {
    let keys: string[] = [];
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof data[key] === 'object' && data[key] !== null) {
          keys = keys.concat(this._getDeepKeys(data[key], newKey));
        } else {
          keys.push(newKey);
        }
      }
    }
    return keys;
  }
}
