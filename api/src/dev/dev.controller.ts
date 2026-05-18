import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WebhooksService } from '../webhooks/webhooks.service';
import { Public } from '../auth/public.decorator';

@ApiTags('dev')
@Controller('dev')
export class DevController {
  constructor(private webhooks: WebhooksService) {}

  @Post('simulate-line-message')
  @Public()
  simulateLineMessage(
    @Body() body: { lineUserId: string; displayName?: string; text: string },
  ) {
    return this.webhooks.handleLineWebhook({
      events: [
        {
          type: 'message',
          message: { type: 'text', text: body.text, id: `sim-${Date.now()}` },
          source: {
            type: 'user',
            userId: body.lineUserId,
            displayName: body.displayName,
          },
        },
      ],
    });
  }
}
