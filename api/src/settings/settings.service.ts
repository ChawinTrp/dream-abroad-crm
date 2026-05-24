import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Runtime settings stored in the `settings` table. Anything an admin
 * might want to tweak without redeploy: archive thresholds, idle
 * severity cutoffs, etc.
 *
 * Pattern: DB value wins; if absent, the consumer falls back to its
 * own env var or hardcoded default.
 */
@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  async get(key: string): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  async getNumber(key: string, envFallback?: string, hardDefault?: number): Promise<number> {
    const v = await this.get(key);
    if (v !== null) return Number(v);
    if (envFallback && process.env[envFallback]) return Number(process.env[envFallback]);
    return hardDefault ?? 0;
  }

  async upsert(key: string, value: string, agentId?: number) {
    return this.prisma.setting.upsert({
      where: { key },
      create: { key, value, updatedBy: agentId ?? null },
      update: { value, updatedBy: agentId ?? null },
    });
  }
}
