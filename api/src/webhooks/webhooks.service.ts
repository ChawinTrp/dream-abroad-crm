import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private messages: MessagesService,
  ) {}

  async handleLineWebhook(body: any) {
    const events = body.events ?? [];
    const results = [];

    for (const event of events) {
      if (event.type !== 'message' || event.message?.type !== 'text') {
        continue;
      }

      const lineUserId = event.source?.userId;
      const text = event.message.text;
      const lineMessageId = event.message.id;

      if (!lineUserId || !text) continue;

      let customer = await this.prisma.customer.findUnique({
        where: { lineUserId },
      });

      if (!customer) {
        const leadStage = await this.prisma.stageDefinition.findFirst({
          where: { key: 'lead' },
        });
        customer = await this.prisma.customer.create({
          data: {
            lineUserId,
            displayName: event.source.displayName ?? `LINE user ${lineUserId.slice(-4)}`,
            initials: (event.source.displayName ?? 'LN').slice(0, 2).toUpperCase(),
            avatarColor: '#94A3B8',
            stageId: leadStage!.id,
            followedAt: new Date(),
          },
        });
        this.logger.log(`New customer created from LINE: ${customer.displayName}`);
      }

      const message = await this.messages.createInbound({
        customerId: customer.id,
        body: text,
        lineMessageId,
      });

      results.push(message);
    }

    return { processed: results.length };
  }
}
