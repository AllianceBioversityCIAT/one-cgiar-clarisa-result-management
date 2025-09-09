import { FindAllOptions } from '../enum/find-all-options';

export interface ElasticFindEntity<EntityDto> {
  findDataForOpenSearch(
    option: FindAllOptions,
    ids?: number[],
  ): Promise<EntityDto[]>;
}
