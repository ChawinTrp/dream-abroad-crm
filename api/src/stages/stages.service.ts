import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StagesService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.stageDefinition.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findOne(id: number) {
    return this.prisma.stageDefinition.findUniqueOrThrow({ where: { id } });
  }

  create(data: {
    key: string;
    label: string;
    dotColor: string;
    sortOrder: number;
  }) {
    return this.prisma.stageDefinition.create({ data });
  }

  update(
    id: number,
    data: Partial<{
      label: string;
      dotColor: string;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.stageDefinition.update({ where: { id }, data });
  }
}
