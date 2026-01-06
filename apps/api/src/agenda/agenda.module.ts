/**
 * MEKANOS S.A.S - API Backend
 * Módulo Enterprise de Agenda
 */

import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';

@Module({
    imports: [DatabaseModule],
    controllers: [AgendaController],
    providers: [AgendaService],
    exports: [AgendaService],
})
export class AgendaModule { }
