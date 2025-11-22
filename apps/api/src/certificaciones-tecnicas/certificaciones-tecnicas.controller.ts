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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CertificacionesTecnicasService } from './certificaciones-tecnicas.service';
import { CreateCertificacionesTecnicasDto } from './dto/create-certificaciones-tecnicas.dto';
import { UpdateCertificacionesTecnicasDto } from './dto/update-certificaciones-tecnicas.dto';

@Controller('certificaciones-tecnicas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CertificacionesTecnicasController {
  constructor(
    private readonly certificacionesTecnicasService: CertificacionesTecnicasService,
  ) {}

  @Post()
  create(
    @Body() createDto: CreateCertificacionesTecnicasDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.certificacionesTecnicasService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Query('id_empleado') idEmpleado?: string,
    @Query('tipo_certificacion') tipoCertificacion?: string,
    @Query('vigente') vigente?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.certificacionesTecnicasService.findAll({
      id_empleado: idEmpleado ? parseInt(idEmpleado, 10) : undefined,
      tipo_certificacion: tipoCertificacion,
      vigente: vigente === 'true' ? true : vigente === 'false' ? false : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.certificacionesTecnicasService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCertificacionesTecnicasDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.certificacionesTecnicasService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.certificacionesTecnicasService.remove(id);
  }
}
