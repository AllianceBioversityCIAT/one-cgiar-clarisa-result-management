import { ApiProperty } from '@nestjs/swagger';
import { ClarisaResultDto } from '../clarisa-result.dto';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertDataDto {
  @ApiProperty({ type: ClarisaResultDto, isArray: true })
  @ValidateNested()
  @Type(() => ClarisaResultDto)
  data: ClarisaResultDto[];
}
