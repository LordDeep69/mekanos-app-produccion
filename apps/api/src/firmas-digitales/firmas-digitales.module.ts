import { Module } from '@nestjs/common';
import { FirmasDigitalesController } from './firmas-digitales.controller';
import { FirmasDigitalesService } from './firmas-digitales.service';

@Module({
  controllers: [FirmasDigitalesController],
  providers: [FirmasDigitalesService],
  exports: [FirmasDigitalesService],
})
export class FirmasDigitalesModule {}
