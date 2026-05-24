import {
  Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { StagesService } from './stages.service';
import { Roles } from '../auth/roles.decorator';

@ApiTags('stages')
@Controller('stages')
export class StagesController {
  constructor(private stages: StagesService) {}

  @Get()
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.stages.findAll(includeInactive === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stages.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() body: { key: string; label: string; dotColor: string; sortOrder: number }) {
    return this.stages.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<{ label: string; dotColor: string; sortOrder: number; isActive: boolean }>,
  ) {
    return this.stages.update(id, body);
  }
}
