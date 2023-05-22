import { Module } from '@nestjs/common';
import { PocController } from './controller/poc.controller';
import { pocService } from './pocService';

@Module({
  controllers: [PocController],
  providers: [pocService]
})
export class PocModule {}