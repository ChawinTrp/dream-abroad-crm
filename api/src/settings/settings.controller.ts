import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Roles } from '../auth/roles.decorator';
import { CurrentAgent } from '../auth/current-agent.decorator';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  @Roles('admin', 'manager')
  findAll() {
    return this.settings.findAll();
  }

  @Patch(':key')
  @Roles('admin')
  upsert(
    @Param('key') key: string,
    @Body() body: { value: string },
    @CurrentAgent() agent: any,
  ) {
    return this.settings.upsert(key, body.value, agent?.id);
  }
}
