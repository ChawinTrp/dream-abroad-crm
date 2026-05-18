import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  findAll(tagType?: string) {
    return this.prisma.tagDefinition.findMany({
      where: {
        isActive: true,
        ...(tagType ? { tagType } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findOne(id: number) {
    return this.prisma.tagDefinition.findUniqueOrThrow({ where: { id } });
  }
}
