import { Module, Global } from '@nestjs/common';
import { CurrentUserUtil } from './current-user.util';
import { CgiarAppConfig } from './cgiar-app-config.util';

@Global()
@Module({
  providers: [CurrentUserUtil, CgiarAppConfig],
  exports: [CurrentUserUtil, CgiarAppConfig],
})
export class GlobalUtilsModule {}
