import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.agent.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: number) {
    return this.prisma.agent.findUniqueOrThrow({ where: { id } });
  }
}
