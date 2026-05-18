import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StagesService } from './stages.service';

@ApiTags('stages')
@Controller('stages')
export class StagesController {
  constructor(private stages: StagesService) {}

  @Get()
  findAll() {
    return this.stages.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stages.findOne(id);
  }
}
