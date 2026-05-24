import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { Roles } from '../auth/roles.decorator';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private agents: AgentsService) {}

  @Get()
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.agents.findAll(includeInactive === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.agents.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() body: {
    name: string; email: string; role?: string;
    initials: string; avatarColor: string;
  }) {
    return this.agents.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.agents.update(id, body);
  }

  // Soft-delete only. Agent records are never hard-deleted because
  // customers, messages, and events all FK to them.
  @Delete(':id')
  @Roles('admin')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.agents.deactivate(id);
  }
}
