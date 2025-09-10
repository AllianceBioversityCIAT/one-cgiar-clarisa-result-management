import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ClarisaResultService } from './clarisa-result.service';
import { UpsertDataDto } from './dto/upsert-data.dto';
import { ResponseUtils } from '../shared/utils/response.utils';
import { ApiQuery } from '@nestjs/swagger';
import { NotEmptyPipe } from '../shared/pipes/not-empy.pipe';
import { DefaultValuePipe } from '../shared/pipes/default-value.pipe';
import { PaginationOptions } from 'src/core/types/base-open-search.types';

@Controller()
export class ClarisaResultController {
  constructor(private readonly service: ClarisaResultService) {}

  @Post('reset')
  async create(@Body() body: UpsertDataDto) {
    return this.service.resetElasticData(body.data).then(() =>
      ResponseUtils.format({
        message: 'Data upserted successfully',
        response: {},
        status: HttpStatus.OK,
      }),
    );
  }

  @Get('all')
  @ApiQuery({ name: 'pageSize', required: false, default: 10000 })
  @ApiQuery({
    name: 'searchAfter',
    required: false,
    description: 'Search after values for pagination (comma-separated)',
  })
  @ApiQuery({
    name: 'lastModifiedDate',
    required: false,
    description:
      'Filter by last modified date (ISO format: 2025-09-10T22:21:52.704832673Z). Returns documents with @last_modified >= this date',
  })
  async getAllPaginated(
    @Query('pageSize', new DefaultValuePipe(10000)) pageSize: number,
    @Query('searchAfter') searchAfterParam?: string,
    @Query('lastModifiedDate') lastModifiedDate?: string,
  ) {
    const searchAfter = searchAfterParam
      ? searchAfterParam
          .split(',')
          .map((val) => (isNaN(Number(val)) ? val : Number(val)))
      : undefined;

    const options: PaginationOptions = {
      pageSize,
      searchAfter,
      lastModifiedDate,
    };

    return this.service.getAllDataPaginated(options).then((data) =>
      ResponseUtils.format({
        message: 'Paginated data retrieved successfully',
        response: data,
        status: HttpStatus.OK,
      }),
    );
  }

  @ApiQuery({ name: 'query', required: true })
  @ApiQuery({ name: 'size', required: false, default: 20 })
  @Get()
  async findAll(
    @Query('query', NotEmptyPipe) query: string,
    @Query('size', new DefaultValuePipe(20)) size: number,
  ) {
    return this.service
      .search(
        query,
        {
          title: true,
          result_code: true,
        },
        [
          {
            title: { order: 'asc' },
          },
        ],
        size,
      )
      .then((data) =>
        ResponseUtils.format({
          message: 'Data retrieved successfully',
          response: data,
          status: HttpStatus.OK,
        }),
      );
  }
}
