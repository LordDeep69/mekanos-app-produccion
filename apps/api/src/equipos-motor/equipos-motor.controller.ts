import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarEquipoMotorCommand } from './application/commands/actualizar-equipo-motor.command';
import { CrearEquipoMotorCommand } from './application/commands/crear-equipo-motor.command';
import { EliminarEquipoMotorCommand } from './application/commands/eliminar-equipo-motor.command';
import { GetAllEquiposMotorQuery } from './application/queries/get-all-equipos-motor.query';
import { GetEquipoMotorByIdQuery } from './application/queries/get-equipo-motor-by-id.query';
import { CreateEquipoMotorDto } from './dto/create-equipo-motor.dto';
import { UpdateEquipoMotorDto } from './dto/update-equipo-motor.dto';

@Controller('equipos-motor')
// @Public() // DESHABILITADO - Se requiere JWT para creado_por y modificado_por
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquiposMotorController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async crear(
    @Body() dto: CreateEquipoMotorDto,
    @CurrentUser('id') userId: number,
  ) {
    const command = new CrearEquipoMotorCommand({
      ...dto,
      creado_por: userId,
    });
    
    return this.commandBus.execute(command);
  }

  @Get()
  async obtenerTodos(
    @Query('tipo_motor') tipo_motor?: string,
    @Query('marca_motor') marca_motor?: string,
    @Query('tipo_combustible') tipo_combustible?: string,
    @Query('tiene_turbocargador') tiene_turbocargador?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};
    
    if (tipo_motor) filters.tipo_motor = tipo_motor;
    if (marca_motor) filters.marca_motor = marca_motor;
    if (tipo_combustible) filters.tipo_combustible = tipo_combustible;
    if (tiene_turbocargador !== undefined) filters.tiene_turbocargador = tiene_turbocargador === 'true';
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    const query = new GetAllEquiposMotorQuery(filters);
    return this.queryBus.execute(query);
  }

  // ENDPOINT DEBUG - COMENTADO (requiere inyección de PrismaService)
  /* 
  @Post('debug')
  async crearDebug(@Body() dto: any): Promise<any> {
    try {
      console.log('=== DEBUG POST equipos-motor ===');
      console.log('DTO:', JSON.stringify(dto, null, 2));
      
      // CREAR USUARIO ID=1 SI NO EXISTE
      await this.prisma.personas.upsert({
        where: { id_persona: 1 },
        update: {},
        create: {
          id_persona: 1,
          tipo_persona: 'NATURAL',
          tipo_identificacion: 'CC',
          numero_identificacion: '1000000000',
          primer_nombre: 'Sistema',
          primer_apellido: 'Admin',
          email_principal: 'admin@mekanos.com',
          telefono_principal: '3000000000',
          activo: true,
        },
      });

      await this.prisma.usuarios.upsert({
        where: { id_usuario: 1 },
        update: {},
        create: {
          id_usuario: 1,
          id_persona: 1,
          username: 'admin',
          email: 'admin@mekanos.com',
          password_hash: '$2b$10$dummy',
          estado: 'ACTIVO',
          debe_cambiar_password: false,
          intentos_fallidos: 0,
          bloqueado_por_intentos: false,
        },
      });

      console.log('✅ Usuario ID=1 garantizado');
      
      return { success: true, message: 'Usuario ID=1 creado/verificado' };
    } catch (error) {
      const err = error as any;
      console.error('❌ ERROR DEBUG:', error);
      return { 
        success: false, 
        error: err.message,
        stack: err.stack,
        details: err
      };
    }
  }

  @Post('test-direct')
  async testDirect(@Body() dto: any): Promise<any> {
    try {
      console.log('=== TEST DIRECT ===');
      console.log('DTO:', JSON.stringify(dto, null, 2));
      
      const result = await this.prisma.equipos_motor.create({
        data: {
          id_equipo: dto.id_equipo,
          tipo_motor: dto.tipo_motor,
          marca_motor: dto.marca_motor,
          potencia_kw: dto.potencia_kw || null,
          potencia_hp: dto.potencia_hp || null,
          // Campos requeridos para COMBUSTION
          tipo_combustible: dto.tipo_combustible || (dto.tipo_motor === 'COMBUSTION' ? 'DIESEL' : null),
          capacidad_aceite_litros: dto.capacidad_aceite_litros || (dto.tipo_motor === 'COMBUSTION' ? 100.00 : null),
          // Campos requeridos para ELECTRICO
          voltaje_operacion_vac: dto.voltaje_operacion_vac || (dto.tipo_motor === 'ELECTRICO' ? '440V' : null),
          numero_fases: dto.numero_fases || (dto.tipo_motor === 'ELECTRICO' ? 'TRIFASICO' : null),
          creado_por: 1,
        },
      });
      
      return { success: true, data: result };
    } catch (error) {
      const err = error as any;
      return {
        success: false,
        error: err.message,
        code: err.code,
        meta: err.meta,
        stack: err.stack?.split('\n').slice(0, 5)
      };
    }
  }
  */

  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    const query = new GetEquipoMotorByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipoMotorDto,
    @CurrentUser('id') userId: number,
  ) {
    const command = new ActualizarEquipoMotorCommand(id, {
      ...dto,
      modificado_por: userId,
    });
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    const command = new EliminarEquipoMotorCommand(id);
    await this.commandBus.execute(command);
    return { message: 'Equipo motor eliminado exitosamente' };
  }
}
