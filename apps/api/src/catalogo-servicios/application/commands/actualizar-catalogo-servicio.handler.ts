import { PrismaService } from '@mekanos/database';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { PrismaCatalogoServiciosRepository } from '../../infrastructure/prisma-catalogo-servicios.repository';
import { ActualizarCatalogoServicioCommand } from './actualizar-catalogo-servicio.command';

@CommandHandler(ActualizarCatalogoServicioCommand)
export class ActualizarCatalogoServicioHandler
  implements ICommandHandler<ActualizarCatalogoServicioCommand>
{
  constructor(
    private readonly repository: PrismaCatalogoServiciosRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: ActualizarCatalogoServicioCommand) {
    // 1. Validar existe
    const existente = await this.repository.findById(command.id);
    if (!existente) {
      throw new NotFoundException(`Servicio con ID ${command.id} no encontrado`);
    }

    // 2. Validar FK tipo_servicio (si se modifica)
    if (command.tipoServicioId !== undefined) {
      const tipoServicio = await this.prisma.tipos_servicio.findUnique({
        where: { id_tipo_servicio: command.tipoServicioId },
      });
      if (!tipoServicio) {
        throw new BadRequestException(`Tipo de servicio con ID ${command.tipoServicioId} no existe`);
      }
    }

    // 3. Validar FK tipo_equipo (si se modifica)
    if (command.tipoEquipoId !== undefined) {
      const tipoEquipo = await this.prisma.tipos_equipo.findUnique({
        where: { id_tipo_equipo: command.tipoEquipoId },
      });
      if (!tipoEquipo) {
        throw new BadRequestException(`Tipo de equipo con ID ${command.tipoEquipoId} no existe`);
      }
    }

    // 4. Validar usuario modificador (si aplica)
    if (command.modificadoPor) {
      const usuario = await this.prisma.usuarios.findUnique({
        where: { id_usuario: command.modificadoPor },
      });
      if (!usuario) {
        throw new BadRequestException(`Usuario con ID ${command.modificadoPor} no existe`);
      }
    }

    // 5. Construir datos de actualización
    const dataUpdate: Prisma.catalogo_serviciosUpdateInput = {
      fecha_modificacion: new Date(),
    };

    if (command.nombreServicio !== undefined) {
      dataUpdate.nombre_servicio = command.nombreServicio.trim();
    }
    if (command.descripcion !== undefined) {
      dataUpdate.descripcion = command.descripcion?.trim();
    }
    if (command.categoria !== undefined) {
      dataUpdate.categoria = command.categoria as any;
    }
    if (command.tipoServicioId !== undefined) {
      dataUpdate.tipo_servicio = command.tipoServicioId ? { connect: { id_tipo_servicio: command.tipoServicioId } } : { disconnect: true };
    }
    if (command.tipoEquipoId !== undefined) {
      dataUpdate.tipos_equipo = command.tipoEquipoId ? { connect: { id_tipo_equipo: command.tipoEquipoId } } : { disconnect: true };
    }
    if (command.duracionEstimadaHoras !== undefined) {
      dataUpdate.duracion_estimada_horas = command.duracionEstimadaHoras;
    }
    if (command.requiereCertificacion !== undefined) {
      dataUpdate.requiere_certificacion = command.requiereCertificacion;
    }
    if (command.tipoCertificacionRequerida !== undefined) {
      dataUpdate.tipo_certificacion_requerida = command.tipoCertificacionRequerida?.trim();
    }
    if (command.precioBase !== undefined) {
      dataUpdate.precio_base = command.precioBase;
    }
    if (command.incluyeRepuestos !== undefined) {
      dataUpdate.incluye_repuestos = command.incluyeRepuestos;
    }
    if (command.activo !== undefined) {
      dataUpdate.activo = command.activo;
    }
    if (command.observaciones !== undefined) {
      dataUpdate.observaciones = command.observaciones?.trim();
    }
    if (command.modificadoPor) {
      dataUpdate.usuarios_catalogo_servicios_modificado_porTousuarios = {
        connect: { id_usuario: command.modificadoPor },
      };
    }

    // 6. Actualizar
    return this.repository.update(command.id, dataUpdate);
  }
}
