import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { Roles } from '../auth/roles.decorator';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private tags: TagsService) {}

  @Get()
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(
    @Query('type') tagType?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.tags.findAll(tagType, includeInactive === 'true');
  }

  @Get('types')
  listTypes() {
    return this.tags.listTypes();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tags.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() body: {
    tagType: string; label: string; countryCode?: string | null;
    sortOrder?: number; colorBg?: string | null;
    colorBorder?: string | null; colorText?: string | null;
  }) {
    return this.tags.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.tags.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tags.remove(id);
  }
}
