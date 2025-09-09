import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ClarisaResultService } from './clarisa-result.service';
import { UpsertDataDto } from './dto/upsert-data.dto';
import { ResponseUtils } from '../shared/utils/response.utils';
import { ApiQuery } from '@nestjs/swagger';
import { NotEmptyPipe } from '../shared/pipes/not-empy.pipe';
import { DefaultValuePipe } from '../shared/pipes/default-value.pipe';

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
