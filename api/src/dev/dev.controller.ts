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
    // Constructs a synthetic LINE webhook payload for testing without real LINE.
    // Types are loosened to `any` because the real LINE SDK types include
    // fields (quoteToken, etc.) that only exist on genuine LINE events.
    return this.webhooks.handleWebhook({
      events: [
        {
          type: 'message',
          mode: 'active',
          timestamp: Date.now(),
          message: {
            type: 'text',
            text: body.text,
            id: `sim-${Date.now()}`,
            quoteToken: 'sim',
          },
          source: {
            type: 'user',
            userId: body.lineUserId,
            displayName: body.displayName,
          } as any,
          replyToken: 'sim',
          webhookEventId: `sim-${Date.now()}`,
          deliveryContext: { isRedelivery: false },
        } as any,
      ],
    });
  }
}
