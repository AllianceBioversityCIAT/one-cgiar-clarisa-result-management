import { Injectable } from '@nestjs/common';
import { BaseOpenSearchApi } from '../core/base-open-search-api';
import { ClarisaResultDto } from './clarisa-result.dto';
import { HttpService } from '@nestjs/axios';
import { CgiarAppConfig } from '../shared/utils/cgiar-app-config.util';

@Injectable()
export class ClarisaResultService extends BaseOpenSearchApi<ClarisaResultDto> {
  constructor(httpService: HttpService, appConfig: CgiarAppConfig) {
    super(httpService, appConfig, undefined, ClarisaResultDto);
  }
}
