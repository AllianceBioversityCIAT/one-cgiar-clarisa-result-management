import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.REQUEST })
export class CurrentUserUtil {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  get user(): any {
    return this.request['user'];
  }

  get user_id(): number {
    return (this.request['user'] as any).sec_user_id;
  }

  get email(): string {
    return (this.request['user'] as any).email;
  }
}

export enum SetAutitEnum {
  NEW,
  UPDATE,
  BOTH,
}
