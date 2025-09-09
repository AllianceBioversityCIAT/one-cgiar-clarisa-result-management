import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class NotEmptyPipe implements PipeTransform {
  transform(value: any) {
    if (!value || value.trim() === '') {
      throw new BadRequestException('Query parameter cannot be empty');
    }
    return value;
  }
}
