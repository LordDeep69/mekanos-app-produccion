import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { InformesPdfController } from './informes-pdf.controller';
import { InformesController } from './informes.controller';
import { InformesService } from './informes.service';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [InformesController, InformesPdfController],
  providers: [InformesService],
  exports: [InformesService],
})
export class InformesModule { }
