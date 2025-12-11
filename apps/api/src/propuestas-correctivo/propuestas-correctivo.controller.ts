import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePropuestasCorrectivoDto } from './dto/create-propuestas-correctivo.dto';
import { UpdatePropuestasCorrectivoDto } from './dto/update-propuestas-correctivo.dto';
import { PropuestasCorrectivoService } from './propuestas-correctivo.service';

@ApiTags('FASE 4 - Propuestas Correctivo')
@ApiBearerAuth('JWT-auth')
@Controller('propuestas-correctivo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropuestasCorrectivoController {
  constructor(private readonly propuestasCorrectivoService: PropuestasCorrectivoService) { }

  @Post()
  @ApiOperation({
    summary: 'Crear propuesta de correctivo',
    description: 'Crea una nueva propuesta de mantenimiento correctivo para un equipo detectado con problemas.',
  })
  @ApiResponse({ status: 201, description: 'Propuesta creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  create(@Body() createDto: CreatePropuestasCorrectivoDto) {
    return this.propuestasCorrectivoService.create(createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar propuestas de correctivo',
    description: 'Obtiene lista paginada de propuestas de mantenimiento correctivo.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Página actual', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items por página', example: 10 })
  @ApiResponse({ status: 200, description: 'Lista de propuestas' })
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.propuestasCorrectivoService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener propuesta por ID',
    description: 'Obtiene el detalle completo de una propuesta de correctivo incluyendo items de repuestos y mano de obra.',
  })
  @ApiParam({ name: 'id', description: 'ID de la propuesta', example: 1 })
  @ApiResponse({ status: 200, description: 'Detalle de la propuesta' })
  @ApiResponse({ status: 404, description: 'Propuesta no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propuestasCorrectivoService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar propuesta de correctivo',
    description: 'Actualiza los datos de una propuesta de correctivo existente.',
  })
  @ApiParam({ name: 'id', description: 'ID de la propuesta', example: 1 })
  @ApiResponse({ status: 200, description: 'Propuesta actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Propuesta no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePropuestasCorrectivoDto,
  ) {
    return this.propuestasCorrectivoService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar propuesta de correctivo',
    description: 'Elimina una propuesta de correctivo (solo si está en estado BORRADOR).',
  })
  @ApiParam({ name: 'id', description: 'ID de la propuesta', example: 1 })
  @ApiResponse({ status: 200, description: 'Propuesta eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Propuesta no encontrada' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar una propuesta que no está en borrador' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.propuestasCorrectivoService.remove(id);
  }
}
