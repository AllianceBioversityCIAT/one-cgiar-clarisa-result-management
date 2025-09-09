import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { CGIARLogger } from '../utils/logger.util';
import { ServerResponseDto } from '../dtos/server-response.dto';

@Catch(Error)
export class GlobalExceptions implements ExceptionFilter {
  private readonly _logger: CGIARLogger = new CGIARLogger('GlobalExceptions');
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const stack = exception?.stack ?? '';

    const status = exception?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const description = exception?.name;
    const error = exception?.message;

    const res: ServerResponseDto<unknown> = {
      message: description,
      status: status,
      errors: error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this._logger.error(stack, {
      method: request.method,
      url: request.url,
    });
    response.status(status).json(res);
  }
}
