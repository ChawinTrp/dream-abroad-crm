import { Module } from '@nestjs/common';
import { ArchiveService } from './archive.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  providers: [ArchiveService],
  exports: [ArchiveService],
})
export class ArchiveModule {}
