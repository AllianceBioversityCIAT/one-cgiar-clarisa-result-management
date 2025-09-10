import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PRIMARY_KEY } from '../shared/const/primary-keys.const';
import { ApiProperty } from '@nestjs/swagger';
import { OpenSearchProperty } from '../core/decorators/opensearch-property.decorator';

export class ResultTypeDto {
  @IsNumber({}, { message: 'Result type ID must be a number' })
  @ApiProperty()
  @OpenSearchProperty({
    type: 'integer',
  })
  id: number;

  @IsString({ message: 'Result type name must be a string' })
  @ApiProperty()
  @OpenSearchProperty({
    type: 'keyword',
  })
  name: string;
}

export class StatusDto {
  @IsNumber({}, { message: 'Status ID must be a number' })
  @ApiProperty()
  id: number;

  @IsString({ message: 'Status name must be a string' })
  @ApiProperty()
  name: string;
}

export class ClarisaResultDto {
  @IsNumber({}, { message: 'Result ID must be a number' })
  @ApiProperty()
  @OpenSearchProperty({
    type: 'integer',
  })
  [PRIMARY_KEY]: number;

  @IsString({ message: 'Result code must be a string' })
  @ApiProperty()
  @OpenSearchProperty({
    type: 'keyword',
  })
  result_code: string;

  @IsNumber({}, { message: 'Reported year ID must be a number' })
  @Min(1000, { message: 'Reported year must be at least 1000' })
  @Max(9999, { message: 'Reported year must be at most 9999' })
  @ApiProperty()
  @OpenSearchProperty({
    type: 'integer',
  })
  reported_year_id: number;

  @IsString({ message: 'Title must be a string' })
  @ApiProperty()
  @OpenSearchProperty({
    type: 'text',
    fielddata: true,
  })
  title: string;

  @ValidateNested({ message: 'Result type must be a valid object' })
  @Type(() => ResultTypeDto)
  @ApiProperty({ type: ResultTypeDto })
  @OpenSearchProperty({
    type: 'object',
    nestedType: ResultTypeDto,
  })
  result_type: ResultTypeDto;

  @ValidateNested({ message: 'Status must be a valid object' })
  @Type(() => StatusDto)
  @ApiProperty({ type: StatusDto })
  @OpenSearchProperty({
    type: 'object',
    nestedType: StatusDto,
  })
  status: StatusDto;

  @IsString({ message: 'Created by must be a string' })
  @Matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/, {
    message:
      'Name can only contain letters, accents, spaces, apostrophes and hyphens',
  })
  @ApiProperty()
  @OpenSearchProperty({
    type: 'keyword',
  })
  created_by: string;

  @IsDateString(
    {},
    { message: 'Created date must be a valid ISO 8601 date string' },
  )
  @ApiProperty()
  @OpenSearchProperty({
    type: 'text',
  })
  created_date: string;

  @IsUrl({}, { message: 'PDF URL must be a valid URL' })
  @ApiProperty()
  @OpenSearchProperty({
    type: 'text',
  })
  pdf_url: string;

  @IsUrl({}, { message: 'Reporting link must be a valid URL' })
  @ApiProperty()
  @OpenSearchProperty({
    type: 'text',
  })
  reporting_link: string;

  @IsOptional()
  @OpenSearchProperty({
    type: 'date',
  })
  '@last_modified'?: string;
}
