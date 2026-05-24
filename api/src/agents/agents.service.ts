import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.agent.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  findOne(id: number) {
    return this.prisma.agent.findUniqueOrThrow({ where: { id } });
  }

  create(data: {
    name: string;
    email: string;
    role?: string;
    initials: string;
    avatarColor: string;
  }) {
    return this.prisma.agent.create({
      data: { ...data, role: data.role ?? 'agent' },
    });
  }

  update(
    id: number,
    data: Partial<{
      name: string;
      email: string;
      role: string;
      initials: string;
      avatarColor: string;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.agent.update({ where: { id }, data });
  }

  deactivate(id: number) {
    return this.prisma.agent.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
