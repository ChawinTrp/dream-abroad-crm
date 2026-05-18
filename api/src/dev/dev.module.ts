import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [DevController],
})
export class DevModule {}
