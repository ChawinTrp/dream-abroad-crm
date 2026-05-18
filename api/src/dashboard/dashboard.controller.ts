import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboard.getStats();
  }

  @Get('agents')
  getAgentMetrics() {
    return this.dashboard.getAgentMetrics();
  }
}
