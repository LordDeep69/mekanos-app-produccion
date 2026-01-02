import { Module } from '@nestjs/common';
import { UsuariosGestionService } from './usuarios-gestion.service';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService, UsuariosGestionService],
  exports: [UsuariosService, UsuariosGestionService],
})
export class UsuariosModule {}
