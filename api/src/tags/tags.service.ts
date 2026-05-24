import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  findAll(tagType?: string, includeInactive = false) {
    return this.prisma.tagDefinition.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(tagType ? { tagType } : {}),
      },
      orderBy: [{ tagType: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  findOne(id: number) {
    return this.prisma.tagDefinition.findUniqueOrThrow({ where: { id } });
  }

  // All distinct tagType values currently in use — used by admin UI to
  // populate the type tabs (existing 4 + any custom ones admins have added).
  async listTypes(): Promise<string[]> {
    const rows = await this.prisma.tagDefinition.findMany({
      select: { tagType: true },
      distinct: ['tagType'],
      orderBy: { tagType: 'asc' },
    });
    return rows.map((r) => r.tagType);
  }

  create(data: {
    tagType: string;
    label: string;
    countryCode?: string | null;
    sortOrder?: number;
    colorBg?: string | null;
    colorBorder?: string | null;
    colorText?: string | null;
  }) {
    return this.prisma.tagDefinition.create({
      data: {
        tagType: data.tagType,
        label: data.label,
        countryCode: data.countryCode ?? null,
        sortOrder: data.sortOrder ?? 0,
        colorBg: data.colorBg ?? null,
        colorBorder: data.colorBorder ?? null,
        colorText: data.colorText ?? null,
      },
    });
  }

  update(
    id: number,
    data: Partial<{
      label: string;
      countryCode: string | null;
      sortOrder: number;
      isActive: boolean;
      colorBg: string | null;
      colorBorder: string | null;
      colorText: string | null;
    }>,
  ) {
    return this.prisma.tagDefinition.update({ where: { id }, data });
  }

  async remove(id: number) {
    const inUse = await this.prisma.customerTag.count({ where: { tagDefinitionId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Tag is used by ${inUse} customer(s). Disable it instead (isActive=false).`,
      );
    }
    return this.prisma.tagDefinition.delete({ where: { id } });
  }
}
