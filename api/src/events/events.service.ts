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
}
