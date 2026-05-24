import { Controller, Post, Body, Req, Headers, HttpCode } from '@nestjs/common';
import { ApiTags, ApiHeader } from '@nestjs/swagger';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { Public } from '../auth/public.decorator';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooks: WebhooksService) {}

  @Post('line')
  @Public()
  @HttpCode(200)
  @ApiHeader({ name: 'X-Line-Signature', required: false })
  async handleLine(
    @Body() body: any,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-line-signature') signature: string,
  ) {
    if (req.rawBody) {
      this.webhooks.verifySignature(req.rawBody, signature);
    }
    return this.webhooks.handleWebhook(body);
  }
}
