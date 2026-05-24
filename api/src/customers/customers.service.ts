import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async findAll(params: {
    stageId?: number;
    agentId?: number;
    search?: string;
    sort?: string;
    includeArchived?: boolean;
  }) {
    const where: any = {};
    if (params.stageId) where.stageId = params.stageId;
    if (params.agentId) where.assignedAgentId = params.agentId;
    if (params.search) {
      where.OR = [
        { displayName: { contains: params.search, mode: 'insensitive' } },
        { notes: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Hide archived customers by default — board, dashboard, and most
    // queries shouldn't surface them unless explicitly opted in.
    if (!params.includeArchived) {
      where.stage = { key: { not: 'archived' } };
    }

    let orderBy: any;
    switch (params.sort) {
      case 'idle':
        orderBy = { lastMessageAt: 'asc' };
        break;
      case 'commitment':
        orderBy = { commitmentScore: 'desc' };
        break;
      case 'name':
        orderBy = { displayName: 'asc' };
        break;
      default:
        orderBy = [
          { urgencyFlag: 'desc' },
          { commitmentScore: 'desc' },
          { lastMessageAt: 'asc' },
        ];
    }

    return this.prisma.customer.findMany({
      where,
      orderBy,
      include: {
        stage: true,
        assignedAgent: true,
        tags: { include: { tagDefinition: true } },
      },
    });
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        stage: true,
        assignedAgent: true,
        scoreUpdater: true,
        lastReplier: true,
        tags: { include: { tagDefinition: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: number, data: any, agentId?: number) {
    const existing = await this.findOne(id);

    if (data.stageId !== undefined && data.stageId !== existing.stageId) {
      await this.events.log({
        customerId: id,
        agentId,
        eventType: 'stage_changed',
        oldValue: String(existing.stageId),
        newValue: String(data.stageId),
      });
    }

    if (
      data.commitmentScore !== undefined &&
      data.commitmentScore !== existing.commitmentScore
    ) {
      data.scoreUpdatedBy = agentId;
      data.scoreUpdatedAt = new Date();
      await this.events.log({
        customerId: id,
        agentId,
        eventType: 'score_changed',
        oldValue: String(existing.commitmentScore),
        newValue: String(data.commitmentScore),
      });
    }

    if (
      data.urgencyFlag !== undefined &&
      data.urgencyFlag !== existing.urgencyFlag
    ) {
      await this.events.log({
        customerId: id,
        agentId,
        eventType: 'urgency_changed',
        oldValue: String(existing.urgencyFlag),
        newValue: String(data.urgencyFlag),
      });
    }

    if (
      data.assignedAgentId !== undefined &&
      data.assignedAgentId !== existing.assignedAgentId
    ) {
      await this.events.log({
        customerId: id,
        agentId,
        eventType: 'agent_changed',
        oldValue: String(existing.assignedAgentId),
        newValue: String(data.assignedAgentId),
      });
    }

    if (data.notes !== undefined && data.notes !== existing.notes) {
      await this.events.log({
        customerId: id,
        agentId,
        eventType: 'notes_changed',
      });
    }

    return this.prisma.customer.update({
      where: { id },
      data,
      include: {
        stage: true,
        assignedAgent: true,
        tags: { include: { tagDefinition: true } },
      },
    });
  }

  async markReplied(customerId: number, agentId?: number) {
    const now = new Date();
    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { lastReplyAt: now, lastReplyBy: agentId ?? null },
      include: {
        stage: true,
        assignedAgent: true,
        tags: { include: { tagDefinition: true } },
      },
    });
    await this.events.log({
      customerId,
      agentId,
      eventType: 'replied',
      newValue: now.toISOString(),
    });
    return updated;
  }

  async addTag(customerId: number, tagDefinitionId: number, agentId?: number) {
    const tagDef = await this.prisma.tagDefinition.findUniqueOrThrow({
      where: { id: tagDefinitionId },
    });

    // Enforce single-select for current_school
    if (tagDef.tagType === 'current_school') {
      await this.prisma.customerTag.deleteMany({
        where: {
          customerId,
          tagDefinition: { tagType: 'current_school' },
        },
      });
    }

    const tag = await this.prisma.customerTag.upsert({
      where: {
        customerId_tagDefinitionId: { customerId, tagDefinitionId },
      },
      create: { customerId, tagDefinitionId, taggedBy: agentId },
      update: {},
      include: { tagDefinition: true },
    });

    await this.events.log({
      customerId,
      agentId,
      eventType: 'tag_added',
      newValue: tagDef.label,
    });

    return tag;
  }

  async removeTag(
    customerId: number,
    tagDefinitionId: number,
    agentId?: number,
  ) {
    const tagDef = await this.prisma.tagDefinition.findUniqueOrThrow({
      where: { id: tagDefinitionId },
    });

    await this.prisma.customerTag.delete({
      where: {
        customerId_tagDefinitionId: { customerId, tagDefinitionId },
      },
    });

    await this.events.log({
      customerId,
      agentId,
      eventType: 'tag_removed',
      oldValue: tagDef.label,
    });
  }
}
