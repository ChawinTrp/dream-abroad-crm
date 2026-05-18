import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { Public } from '../auth/public.decorator';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooks: WebhooksService) {}

  @Post('line')
  @Public()
  handleLine(@Body() body: any) {
    return this.webhooks.handleLineWebhook(body);
  }
}
