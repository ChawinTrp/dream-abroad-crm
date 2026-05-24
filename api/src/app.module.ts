import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { StagesModule } from './stages/stages.module';
import { TagsModule } from './tags/tags.module';
import { AgentsModule } from './agents/agents.module';
import { CustomersModule } from './customers/customers.module';
import { MessagesModule } from './messages/messages.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ArchiveModule } from './archive/archive.module';
import { SettingsModule } from './settings/settings.module';
import { DevModule } from './dev/dev.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    EventsModule,
    StagesModule,
    TagsModule,
    AgentsModule,
    CustomersModule,
    MessagesModule,
    DashboardModule,
    WebhooksModule,
    ArchiveModule,
    SettingsModule,
    ...(process.env.NODE_ENV !== 'production' ? [DevModule] : []),
  ],
})
export class AppModule {}
