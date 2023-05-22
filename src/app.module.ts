import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PocModule } from './poc/poc.module';

@Module({
  imports: [PocModule, TypeOrmModule.forRoot({
    name: 'default',
    type: 'mssql',
    host:'vppprsql3',
    port: 1574,
    username: 'user-synergies',
    password: '#user-synergies@VPPPRSQL3#007',
    database: 'SYNERGIES_PREPRODUCTION_ARCHIVE',
    extra: {
      trustServerCertificate: true,
    },
    logging: true,
    entities: [],
    synchronize: true,
  }),
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
