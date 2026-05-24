import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  /**
   * Runs daily at 03:00 server time.
   * Auto-archives customers in "enrolled" who entered that stage more than
   * ENROLLED_ARCHIVE_DAYS days ago (default 90).
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyArchive() {
    const result = await this.runArchive();
    this.logger.log(
      `Daily archive: ${result.archived} customer(s) moved to archived`,
    );
    return result;
  }

  async runArchive(): Promise<{ archived: number; thresholdDays: number }> {
    const thresholdDays = Number(process.env.ENROLLED_ARCHIVE_DAYS ?? '90');
    const cutoff = new Date(Date.now() - thresholdDays * 86400000);

    const [enrolledStage, archivedStage] = await Promise.all([
      this.prisma.stageDefinition.findUnique({ where: { key: 'enrolled' } }),
      this.prisma.stageDefinition.findUnique({ where: { key: 'archived' } }),
    ]);

    if (!enrolledStage || !archivedStage) {
      this.logger.warn(
        'enrolled or archived stage missing — skipping auto-archive',
      );
      return { archived: 0, thresholdDays };
    }

    // Candidates: customers currently in enrolled
    const candidates = await this.prisma.customer.findMany({
      where: { stageId: enrolledStage.id },
      select: { id: true },
    });

    if (candidates.length === 0) return { archived: 0, thresholdDays };

    // For each candidate, find the most recent stage_changed event that
    // moved them into enrolled. If that event is older than cutoff, archive.
    let archived = 0;
    for (const c of candidates) {
      const lastMoveToEnrolled = await this.prisma.customerEvent.findFirst({
        where: {
          customerId: c.id,
          eventType: 'stage_changed',
          newValue: String(enrolledStage.id),
        },
        orderBy: { createdAt: 'desc' },
      });

      // No event = we don't know when they enrolled (e.g. seeded data).
      // Be conservative: don't auto-archive.
      if (!lastMoveToEnrolled) continue;

      if (lastMoveToEnrolled.createdAt > cutoff) continue;

      await this.prisma.customer.update({
        where: { id: c.id },
        data: { stageId: archivedStage.id },
      });
      await this.events.log({
        customerId: c.id,
        eventType: 'stage_changed',
        oldValue: String(enrolledStage.id),
        newValue: String(archivedStage.id),
      });
      archived++;
    }

    return { archived, thresholdDays };
  }
}
