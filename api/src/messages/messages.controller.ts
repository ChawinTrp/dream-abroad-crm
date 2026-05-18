import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CurrentAgent } from '../auth/current-agent.decorator';

@ApiTags('messages')
@Controller('customers/:customerId/messages')
export class MessagesController {
  constructor(private messages: MessagesService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messages.findByCustomer(
      customerId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 100,
    );
  }

  @Post()
  create(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() body: { body: string },
    @CurrentAgent() agent: any,
  ) {
    return this.messages.createOutbound({
      customerId,
      body: body.body,
      agentId: agent?.id,
    });
  }
}
