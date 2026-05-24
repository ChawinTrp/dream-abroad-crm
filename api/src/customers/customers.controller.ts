import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CurrentAgent } from '../auth/current-agent.decorator';
import { Roles } from '../auth/roles.decorator';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private customers: CustomersService) {}

  @Get()
  @ApiQuery({ name: 'stageId', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['priority', 'idle', 'commitment', 'name'] })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  findAll(
    @Query('stageId') stageId?: string,
    @Query('agentId') agentId?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.customers.findAll({
      stageId: stageId ? Number(stageId) : undefined,
      agentId: agentId ? Number(agentId) : undefined,
      search,
      sort,
      includeArchived: includeArchived === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customers.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager', 'agent')
  create(
    @Body() body: {
      displayName: string;
      stageId?: number;
      assignedAgentId?: number;
      notes?: string;
      avatarColor?: string;
      lineUserId?: string;
    },
    @CurrentAgent() agent: any,
  ) {
    return this.customers.create(body, agent?.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
    @CurrentAgent() agent: any,
  ) {
    return this.customers.update(id, data, agent?.id);
  }

  @Post(':id/replied')
  markReplied(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAgent() agent: any,
  ) {
    return this.customers.markReplied(id, agent?.id);
  }

  @Post(':id/tags/:tagDefId')
  addTag(
    @Param('id', ParseIntPipe) customerId: number,
    @Param('tagDefId', ParseIntPipe) tagDefinitionId: number,
    @CurrentAgent() agent: any,
  ) {
    return this.customers.addTag(customerId, tagDefinitionId, agent?.id);
  }

  @Delete(':id/tags/:tagDefId')
  removeTag(
    @Param('id', ParseIntPipe) customerId: number,
    @Param('tagDefId', ParseIntPipe) tagDefinitionId: number,
    @CurrentAgent() agent: any,
  ) {
    return this.customers.removeTag(customerId, tagDefinitionId, agent?.id);
  }
}
