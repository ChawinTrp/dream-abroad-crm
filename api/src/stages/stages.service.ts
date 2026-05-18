import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StagesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.stageDefinition.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findOne(id: number) {
    return this.prisma.stageDefinition.findUniqueOrThrow({ where: { id } });
  }
}
