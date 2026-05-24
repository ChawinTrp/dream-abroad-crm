import { Module } from '@nestjs/common';
import { ArchiveService } from './archive.service';
import { EventsModule } from '../events/events.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [EventsModule, SettingsModule],
  providers: [ArchiveService],
  exports: [ArchiveService],
})
export class ArchiveModule {}
