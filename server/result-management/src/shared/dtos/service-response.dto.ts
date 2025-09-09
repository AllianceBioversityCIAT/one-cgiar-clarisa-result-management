import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class ServiceResponseDto<T> {
  @ApiProperty()
  status: HttpStatus;

  @ApiProperty({
    description:
      'The response field can contain different types of data depending on the context.',
  })
  response?: T;

  @ApiProperty()
  message: string;

  @ApiProperty()
  errors?: any;
}

export class ServiceResponseErrorDto<T> {
  @ApiProperty()
  status: HttpStatus;

  @ApiProperty()
  name: string;

  @ApiProperty()
  message: T;
}
