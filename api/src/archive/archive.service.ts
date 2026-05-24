import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { SettingsService } from '../settings/settings.service';

export interface ArchiveResult {
  enrolledClosed: number;
  leadsArchived: number;
  enrolledThresholdDays: number;
  leadColdDays: number;
}

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
    private settings: SettingsService,
  ) {}

  /**
   * Runs daily at 03:00 server time. Two passes:
   *
   *  1. Enrolled customers whose move-to-enrolled event is older than
   *     ENROLLED_ARCHIVE_DAYS (default 90) → moved to "closed".
   *     Closed customers DO NOT auto-revive on new messages.
   *
   *  2. Lead customers with no activity (no inbound, no reply, no follow)
   *     for LEAD_COLD_DAYS (default 90) → moved to "archived".
   *     Archived customers DO auto-revive to Lead on new inbound message
   *     (see WebhooksService.maybeReviveFromArchive).
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyArchive() {
    const result = await this.runArchive();
    this.logger.log(
      `Daily archive: ${result.enrolledClosed} enrolled→closed, ` +
        `${result.leadsArchived} cold leads→archived`,
    );
    return result;
  }

  async runArchive(): Promise<ArchiveResult> {
    // DB setting wins over env var, env over hardcoded default.
    const enrolledThresholdDays = await this.settings.getNumber(
      'enrolled_archive_days', 'ENROLLED_ARCHIVE_DAYS', 90,
    );
    const leadColdDays = await this.settings.getNumber(
      'lead_cold_days', 'LEAD_COLD_DAYS', 90,
    );

    const enrolledClosed = await this.closeEnrolled(enrolledThresholdDays);
    const leadsArchived = await this.archiveColdLeads(leadColdDays);

    return {
      enrolledClosed,
      leadsArchived,
      enrolledThresholdDays,
      leadColdDays,
    };
  }

  /** Move long-enrolled customers to "closed" stage. */
  private async closeEnrolled(thresholdDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - thresholdDays * 86400000);

    const [enrolledStage, closedStage] = await Promise.all([
      this.prisma.stageDefinition.findUnique({ where: { key: 'enrolled' } }),
      this.prisma.stageDefinition.findUnique({ where: { key: 'closed' } }),
    ]);
    if (!enrolledStage || !closedStage) {
      this.logger.warn(
        'enrolled or closed stage missing — skipping enrolled→closed pass',
      );
      return 0;
    }

    const candidates = await this.prisma.customer.findMany({
      where: { stageId: enrolledStage.id },
      select: { id: true },
    });
    if (candidates.length === 0) return 0;

    let count = 0;
    for (const c of candidates) {
      // Find the most recent move-to-enrolled event. If absent (e.g. seeded
      // data), we don't know when they enrolled — be conservative, skip.
      const lastMove = await this.prisma.customerEvent.findFirst({
        where: {
          customerId: c.id,
          eventType: 'stage_changed',
          newValue: String(enrolledStage.id),
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!lastMove || lastMove.createdAt > cutoff) continue;

      await this.prisma.customer.update({
        where: { id: c.id },
        data: { stageId: closedStage.id },
      });
      await this.events.log({
        customerId: c.id,
        eventType: 'stage_changed',
        oldValue: String(enrolledStage.id),
        newValue: String(closedStage.id),
      });
      count++;
    }
    return count;
  }

  /** Move silent leads to "archived" stage. */
  private async archiveColdLeads(coldDays: number): Promise<number> {
    const cutoffMs = Date.now() - coldDays * 86400000;

    const [leadStage, archivedStage] = await Promise.all([
      this.prisma.stageDefinition.findUnique({ where: { key: 'lead' } }),
      this.prisma.stageDefinition.findUnique({ where: { key: 'archived' } }),
    ]);
    if (!leadStage || !archivedStage) {
      this.logger.warn(
        'lead or archived stage missing — skipping cold-lead pass',
      );
      return 0;
    }

    const candidates = await this.prisma.customer.findMany({
      where: { stageId: leadStage.id },
      select: {
        id: true,
        lastMessageAt: true,
        lastReplyAt: true,
        followedAt: true,
        createdAt: true,
      },
    });
    if (candidates.length === 0) return 0;

    let count = 0;
    for (const c of candidates) {
      // Last activity = max of all known timestamps. Falls back to createdAt
      // if customer has never engaged at all (e.g., follow-only, never messaged).
      const lastActivityMs = Math.max(
        c.lastMessageAt?.getTime() ?? 0,
        c.lastReplyAt?.getTime() ?? 0,
        c.followedAt?.getTime() ?? 0,
        c.createdAt.getTime(),
      );
      if (lastActivityMs > cutoffMs) continue;

      await this.prisma.customer.update({
        where: { id: c.id },
        data: { stageId: archivedStage.id },
      });
      await this.events.log({
        customerId: c.id,
        eventType: 'stage_changed',
        oldValue: String(leadStage.id),
        newValue: String(archivedStage.id),
      });
      count++;
    }
    return count;
  }
}
