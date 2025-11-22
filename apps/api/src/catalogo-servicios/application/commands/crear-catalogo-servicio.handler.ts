import { PrismaService } from '@mekanos/database';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaCatalogoServiciosRepository } from '../../infrastructure/prisma-catalogo-servicios.repository';
import { CrearCatalogoServicioCommand } from './crear-catalogo-servicio.command';

@CommandHandler(CrearCatalogoServicioCommand)
export class CrearCatalogoServicioHandler implements ICommandHandler<CrearCatalogoServicioCommand> {
  constructor(
    private readonly repository: PrismaCatalogoServiciosRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CrearCatalogoServicioCommand) {
    // 1. Normalizar código
    const codigoNormalizado = command.codigoServicio.toUpperCase().trim();

    // 2. Validar código único
    const existente = await this.repository.findByCodigo(codigoNormalizado);
    if (existente) {
      throw new ConflictException(`Código de servicio '${codigoNormalizado}' ya existe`);
    }

    // 3. Validar FK tipo_servicio (si aplica)
    if (command.tipoServicioId) {
      const tipoServicio = await this.prisma.tipos_servicio.findUnique({
        where: { id_tipo_servicio: command.tipoServicioId },
      });
      if (!tipoServicio) {
        throw new BadRequestException(`Tipo de servicio con ID ${command.tipoServicioId} no existe`);
      }
    }

    // 4. Validar FK tipo_equipo (si aplica)
    if (command.tipoEquipoId) {
      const tipoEquipo = await this.prisma.tipos_equipo.findUnique({
        where: { id_tipo_equipo: command.tipoEquipoId },
      });
      if (!tipoEquipo) {
        throw new BadRequestException(`Tipo de equipo con ID ${command.tipoEquipoId} no existe`);
      }
    }

    // 5. Validar usuario creador (si aplica)
    if (command.creadoPor) {
      const usuario = await this.prisma.usuarios.findUnique({
        where: { id_usuario: command.creadoPor },
      });
      if (!usuario) {
        throw new BadRequestException(`Usuario con ID ${command.creadoPor} no existe`);
      }
    }

    // 6. Validar lógica certificación
    if (command.tipoCertificacionRequerida && !command.requiereCertificacion) {
      throw new BadRequestException(
        'Si especifica tipo_certificacion_requerida, debe marcar requiere_certificacion = true',
      );
    }

    // 7. Crear registro
    return this.repository.create({
      codigo_servicio: codigoNormalizado,
      nombre_servicio: command.nombreServicio.trim(),
      descripcion: command.descripcion?.trim(),
      categoria: command.categoria as any,
      tipo_servicio: command.tipoServicioId ? { connect: { id_tipo_servicio: command.tipoServicioId } } : undefined,
      tipos_equipo: command.tipoEquipoId ? { connect: { id_tipo_equipo: command.tipoEquipoId } } : undefined,
      duracion_estimada_horas: command.duracionEstimadaHoras,
      requiere_certificacion: command.requiereCertificacion ?? false,
      tipo_certificacion_requerida: command.tipoCertificacionRequerida?.trim(),
      precio_base: command.precioBase,
      incluye_repuestos: command.incluyeRepuestos ?? false,
      activo: command.activo ?? true,
      observaciones: command.observaciones?.trim(),
      usuarios_catalogo_servicios_creado_porTousuarios: command.creadoPor
        ? { connect: { id_usuario: command.creadoPor } }
        : undefined,
    });
  }
}
