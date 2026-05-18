import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const agentId = request.headers['x-agent-id'];

    if (agentId) {
      const agent = await this.prisma.agent.findUnique({
        where: { id: Number(agentId) },
      });
      if (agent) {
        request.agent = agent;
      }
    }

    // Pass-through: allow unauthenticated requests for now
    // When real auth is implemented, return false here if no agent
    return true;
  }
}
