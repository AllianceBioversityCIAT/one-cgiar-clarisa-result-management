import { ExecutionContext, Logger } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { env } from 'process';

// Enum para los niveles de log
export enum LogLevelEnum {
  LOG = 'LOG',
  ERROR = 'ERROR',
  WARN = 'WARN',
  DEBUG = 'DEBUG',
  VERBOSE = 'VERBOSE',
  SUCCESS = 'SUCCESS',
  INFO = 'INFO',
  SECURITY = 'SECURITY',
  API = 'API',
  DATABASE = 'DATABASE',
}

// Enum para los colores
export enum LogColor {
  RESET = '\x1b[0m',
  BRIGHT = '\x1b[1m',
  DIM = '\x1b[2m',
  RED = '\x1b[31m',
  GREEN = '\x1b[32m',
  YELLOW = '\x1b[33m',
  BLUE = '\x1b[34m',
  MAGENTA = '\x1b[35m',
  CYAN = '\x1b[36m',
  WHITE = '\x1b[37m',
  BG_RED = '\x1b[41m',
  BG_GREEN = '\x1b[42m',
  BG_YELLOW = '\x1b[43m',
  BG_BLUE = '\x1b[44m',
}

export interface loggerMetadata {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  user: { id: string; name: string; email: string };
  payload?: any;
}

export class CGIARLogger extends Logger {
  private readonly name: string;

  constructor(name: string) {
    const tempContext = env.CL_APP_NAME || 'System';
    super(tempContext);
    this.name = name;
  }

  private readonly levelColors = {
    [LogLevelEnum.LOG]: LogColor.GREEN,
    [LogLevelEnum.ERROR]: LogColor.RED,
    [LogLevelEnum.WARN]: LogColor.YELLOW,
    [LogLevelEnum.DEBUG]: LogColor.MAGENTA,
    [LogLevelEnum.VERBOSE]: LogColor.CYAN,
    [LogLevelEnum.SUCCESS]: LogColor.BG_GREEN,
    [LogLevelEnum.INFO]: LogColor.BLUE,
    [LogLevelEnum.SECURITY]: LogColor.BG_RED,
    [LogLevelEnum.API]: LogColor.GREEN,
    [LogLevelEnum.DATABASE]: LogColor.YELLOW,
  };

  private getComponentNameFromContext(context: ExecutionContext): string {
    const handler = context.getHandler();
    const className = context.getClass().name;
    const handlerName = handler.name;
    return `[${className}] [${handlerName}]`;
  }

  private getComponentNameFromStack<T extends Error>(error: T): string {
    if (!error?.stack) return '[UnknownClass] [UnknownMethod]';

    const classRegex = /at\s(.*?)\./;
    const handlerRegex = /\.(\w+)\s\(/;

    const classMatch = classRegex.exec(error.stack || '');
    const handlerMatch = handlerRegex.exec(error.stack || '');

    const className = classMatch?.[1] || 'UnknownClass';
    const handlerName = handlerMatch?.[1] || 'UnknownMethod';
    return `[${className}] [${handlerName}]`;
  }

  private processMessage(
    message: any,
    level: LogLevelEnum,
    context?: string,
  ): string {
    let tempMessage = '';
    if (typeof message !== 'string') {
      tempMessage = JSON.stringify(message, null, 2);
    } else {
      tempMessage = message;
    }

    const headMessage: string = this.getHeaderMessage(context);

    return `${LogColor.YELLOW}${headMessage} ${this.levelColors[level]}${tempMessage}${LogColor.RESET}`;
  }

  private getHeaderMessage(context?: any): string {
    if (context && context instanceof Error) {
      return this.getComponentNameFromStack(context);
    } else if (context && context instanceof ExecutionContextHost) {
      return this.getComponentNameFromContext(context);
    }

    return `[${this.name}]`;
  }

  public log(message: any, context?: any, _metadata?: loggerMetadata): void {
    const processedMessage = this.processMessage(message, LogLevelEnum.LOG);
    if (context) super.log(processedMessage, context);
    else super.log(processedMessage);
  }

  public debug(message: any, context?: any, _metadata?: loggerMetadata): void {
    const processedMessage = this.processMessage(message, LogLevelEnum.DEBUG);
    if (context) super.debug(processedMessage, context);
    else super.debug(processedMessage);
  }

  public error(message: any, stack: any, context?: any): void {
    const processedMessage = this.processMessage(message, LogLevelEnum.ERROR);
    if (context) super.error(processedMessage, stack, context);
    else super.error(processedMessage, stack);
  }

  public warn(message: any, context?: any, _metadata?: loggerMetadata): void {
    const processedMessage = this.processMessage(message, LogLevelEnum.WARN);
    if (context) super.warn(processedMessage, context);
    else super.warn(processedMessage);
  }
}
