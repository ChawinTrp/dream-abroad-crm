import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    customerId: number;
    agentId?: number;
    eventType: string;
    oldValue?: string;
    newValue?: string;
  }) {
    return this.prisma.customerEvent.create({
      data: {
        customerId: params.customerId,
        agentId: params.agentId ?? null,
        eventType: params.eventType,
        oldValue: params.oldValue ?? null,
        newValue: params.newValue ?? null,
      },
    });
  }

  async findAll(params: {
    agentId?: number;
    customerId?: number;
    eventType?: string;
    since?: Date;
    limit?: number;
  }) {
    return this.prisma.customerEvent.findMany({
      where: {
        ...(params.agentId ? { agentId: params.agentId } : {}),
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.eventType ? { eventType: params.eventType } : {}),
        ...(params.since ? { createdAt: { gte: params.since } } : {}),
      },
      include: {
        agent: { select: { id: true, name: true, initials: true, avatarColor: true } },
        customer: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 100,
    });
  }
}
