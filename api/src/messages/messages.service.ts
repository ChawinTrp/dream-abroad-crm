import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
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
  }) {
    const message = await this.prisma.message.create({
      data: {
        customerId: params.customerId,
        direction: 'in',
        body: params.body,
        sentAt: new Date(),
        lineMessageId: params.lineMessageId,
      },
    });

    await this.prisma.customer.update({
      where: { id: params.customerId },
      data: {
        lastMessageAt: message.sentAt,
        totalMessages: { increment: 1 },
      },
    });

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
