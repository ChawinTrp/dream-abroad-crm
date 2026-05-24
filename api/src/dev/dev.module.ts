import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ArchiveModule } from '../archive/archive.module';

@Module({
  imports: [WebhooksModule, ArchiveModule],
  controllers: [DevController],
})
export class DevModule {}
