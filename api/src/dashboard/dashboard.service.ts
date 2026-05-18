import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stages = await this.prisma.stageDefinition.findMany();
    const stageMap = new Map(stages.map((s) => [s.key, s.id]));

    const [activeCount, unattendedCount, appliedThisMonth, enrolledThisMonth] =
      await Promise.all([
        this.prisma.customer.count({
          where: { stageId: stageMap.get('active') },
        }),
        this.prisma.customer.count({
          where: {
            lastMessageAt: { lt: eightHoursAgo },
            OR: [
              { lastReplyAt: null },
              { lastReplyAt: { lt: this.prisma.customer.fields?.lastMessageAt as any } },
            ],
          },
        }).catch(() =>
          // Fallback: count customers where lastMessageAt > 8h and no reply after
          this.prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count FROM customers
            WHERE last_message_at < ${eightHoursAgo}
            AND (last_reply_at IS NULL OR last_reply_at < last_message_at)
          `.then((r) => Number(r[0].count)),
        ),
        this.prisma.customerEvent.count({
          where: {
            eventType: 'stage_changed',
            newValue: String(stageMap.get('applied')),
            createdAt: { gte: monthStart },
          },
        }),
        this.prisma.customerEvent.count({
          where: {
            eventType: 'stage_changed',
            newValue: String(stageMap.get('enrolled')),
            createdAt: { gte: monthStart },
          },
        }),
      ]);

    return {
      activeCustomers: activeCount,
      unattendedCount,
      appliedThisMonth,
      enrolledThisMonth,
    };
  }

  async getAgentMetrics() {
    const agents = await this.prisma.agent.findMany({
      where: { role: 'agent' },
      include: {
        assignedCustomers: {
          include: { stage: true },
        },
        sentMessages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    });

    const now = new Date();
    const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);

    return agents.map((agent) => {
      const customers = agent.assignedCustomers;
      const stageBreakdown: Record<string, number> = {};
      let unattendedCount = 0;

      for (const c of customers) {
        const key = c.stage.key;
        stageBreakdown[key] = (stageBreakdown[key] || 0) + 1;

        if (
          c.lastMessageAt &&
          c.lastMessageAt < eightHoursAgo &&
          (!c.lastReplyAt || c.lastReplyAt < c.lastMessageAt)
        ) {
          unattendedCount++;
        }
      }

      return {
        id: agent.id,
        name: agent.name,
        initials: agent.initials,
        avatarColor: agent.avatarColor,
        assignedCount: customers.length,
        unattendedCount,
        stageBreakdown,
        lastActiveAt: agent.sentMessages[0]?.sentAt ?? null,
      };
    });
  }
}
