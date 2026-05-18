import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { TagsService } from './tags.service';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private tags: TagsService) {}

  @Get()
  @ApiQuery({ name: 'type', required: false })
  findAll(@Query('type') tagType?: string) {
    return this.tags.findAll(tagType);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tags.findOne(id);
  }
}
