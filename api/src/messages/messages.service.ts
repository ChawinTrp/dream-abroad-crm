import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(private prisma: PrismaService) {}

  async findByCustomer(customerId: number, page = 1, limit = 100) {
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { customerId },
        orderBy: { sentAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { agent: true },
      }),
      this.prisma.message.count({ where: { customerId } }),
    ]);
    return { data: messages, total, page, limit };
  }

  async createInbound(params: {
    customerId: number;
    body: string;
    lineMessageId?: string;
    sentAt?: Date; // LINE event timestamp; falls back to now()
  }) {
    const sentAt = params.sentAt ?? new Date();

    // ── Idempotency ──────────────────────────────────────────────────────
    // LINE may redeliver the same webhook event (network retries, our 5xx,
    // the redelivery feature). Each LINE message has a stable id; if we've
    // already stored it, skip silently so we don't double-insert or
    // double-count totalMessages.
    if (params.lineMessageId) {
      const existing = await this.prisma.message.findUnique({
        where: { lineMessageId: params.lineMessageId },
      });
      if (existing) {
        this.logger.debug(
          `Duplicate LINE message ${params.lineMessageId} ignored`,
        );
        return existing;
      }
    }

    let message;
    try {
      message = await this.prisma.message.create({
        data: {
          customerId: params.customerId,
          direction: 'in',
          body: params.body,
          sentAt,
          lineMessageId: params.lineMessageId,
        },
      });
    } catch (e) {
      // Race backstop: two duplicate deliveries arriving concurrently both
      // pass the findUnique check, then one loses the unique-constraint race.
      // Treat the loser as a successful no-op.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002' &&
        params.lineMessageId
      ) {
        const existing = await this.prisma.message.findUnique({
          where: { lineMessageId: params.lineMessageId },
        });
        if (existing) return existing;
      }
      throw e;
    }

    // One atomic update:
    //  - totalMessages always increments (this is a genuinely new row)
    //  - last_message_at only moves forward (GREATEST) so a redelivered OLD
    //    event can't clobber a newer timestamp we already recorded
    await this.prisma.$executeRaw`
      UPDATE customers
      SET total_messages = total_messages + 1,
          last_message_at = GREATEST(COALESCE(last_message_at, ${sentAt}), ${sentAt})
      WHERE id = ${params.customerId}
    `;

    return message;
  }

  async createOutbound(params: {
    customerId: number;
    body: string;
    agentId: number;
  }) {
    const message = await this.prisma.message.create({
      data: {
        customerId: params.customerId,
        direction: 'out',
        body: params.body,
        sentAt: new Date(),
        agentId: params.agentId,
      },
    });

    await this.prisma.customer.update({
      where: { id: params.customerId },
      data: {
        lastReplyAt: message.sentAt,
        lastReplyBy: params.agentId,
        totalMessages: { increment: 1 },
      },
    });

    return message;
  }
}
