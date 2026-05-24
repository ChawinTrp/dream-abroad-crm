import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { Roles } from '../auth/roles.decorator';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private events: EventsService) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'sinceDays', required: false, description: 'Limit to events created in the last N days' })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('agentId') agentId?: string,
    @Query('customerId') customerId?: string,
    @Query('eventType') eventType?: string,
    @Query('sinceDays') sinceDays?: string,
    @Query('limit') limit?: string,
  ) {
    return this.events.findAll({
      agentId: agentId ? Number(agentId) : undefined,
      customerId: customerId ? Number(customerId) : undefined,
      eventType,
      since: sinceDays ? new Date(Date.now() - Number(sinceDays) * 86400000) : undefined,
      limit: limit ? Number(limit) : 100,
    });
  }
}
