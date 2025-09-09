import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class DefaultValuePipe implements PipeTransform {
  constructor(private readonly defaultValue: any) {}

  transform(value: any) {
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return this.defaultValue;
    }

    return this.castToType(value, typeof this.defaultValue);
  }

  castToType(value: any, type: string) {
    if (typeof value === type) {
      return value;
    }

    let returnValue: any = null;
    switch (type) {
      case 'number':
        returnValue = parseFloat(value);
        break;
      case 'boolean':
        returnValue = value === 'true';
        break;
      case 'string':
        returnValue = value.toString();
        break;
    }
    return returnValue;
  }
}
