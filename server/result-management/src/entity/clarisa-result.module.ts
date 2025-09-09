import { Module } from '@nestjs/common';
import { ClarisaResultController } from './clarisa-result.controller';
import { ClarisaResultService } from './clarisa-result.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [ClarisaResultController],
  imports: [HttpModule],
  providers: [ClarisaResultService],
  exports: [ClarisaResultService],
})
export class ClarisaResultModule {}
