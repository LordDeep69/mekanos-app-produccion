import { PrismaService } from '@mekanos/database';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProcesarAprobacionCommand } from './procesar-aprobacion.command';

/**
 * PROCESAR APROBACION HANDLER
 *
 * Flujo:
 * 1. Verificar aprobación existe y estado PENDIENTE
 * 2. TODO: Validar usuario tiene nivel jerárquico suficiente (Fase 7 - roles)
 * 3. Actualizar aprobación (estado, aprobadaPor, observaciones)
 * 4. Si APROBADA: Cambiar cotización → APROBADA_INTERNA (id_estado = 3)
 * 5. Si RECHAZADA: Cambiar cotización → BORRADOR (id_estado = 1) para correcciones
 * 6. TODO: Notificar solicitante (Fase 7)
 */
@Injectable()
@CommandHandler(ProcesarAprobacionCommand)
export class ProcesarAprobacionHandler implements ICommandHandler<ProcesarAprobacionCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ProcesarAprobacionCommand): Promise<any> {
    // 1. Verificar aprobación existe y estado PENDIENTE
    const aprobacion = await this.prisma.aprobaciones_cotizacion.findUnique({
      where: { id_aprobacion: command.idAprobacion },
      include: {
        cotizacion: {
          select: {
            id_cotizacion: true,
            numero_cotizacion: true,
            total_cotizacion: true,
            id_estado: true,
          },
        },
      },
    });

    if (!aprobacion) {
      throw new NotFoundException(`Aprobación ${command.idAprobacion} no encontrada`);
    }

    if (aprobacion.estado_aprobacion !== 'PENDIENTE') {
      throw new BadRequestException(
        `Aprobación ya procesada: ${aprobacion.estado_aprobacion}`
      );
    }

    // 2. TODO Fase 7: Validar usuario tiene nivel jerárquico suficiente
    // const usuario = await this.usuariosService.findById(command.aprobadaPor);
    // if (!this.validarNivelAprobador(usuario, aprobacion.nivel_aprobacion)) {
    //   throw new ForbiddenException(`Requiere nivel ${aprobacion.nivel_aprobacion} para aprobar`);
    // }

    // 3. Actualizar aprobación
    const aprobacionActualizada = await this.prisma.aprobaciones_cotizacion.update({
      where: { id_aprobacion: command.idAprobacion },
      data: {
        estado_aprobacion: command.decision,
        aprobada_por: command.aprobadaPor,
        fecha_respuesta: new Date(),
        observaciones_aprobador: command.observacionesAprobador,
      },
      include: {
        cotizacion: true,
      },
    });

    // 4. Si APROBADA: Cotización → APROBADA_INTERNA (id_estado = 3)
    if (command.decision === 'APROBADA') {
      await this.prisma.cotizaciones.update({
        where: { id_cotizacion: aprobacion.id_cotizacion ?? undefined },
        data: {
          id_estado: 3, // APROBADA_INTERNA
        },
      });

      return {
        message: 'Aprobación procesada: APROBADA. Cotización lista para enviar',
        aprobacion: aprobacionActualizada,
        nuevo_estado: 'APROBADA_INTERNA',
      };
    }

    // 5. Si RECHAZADA: Cotización → BORRADOR (id_estado = 1) para correcciones
    if (command.decision === 'RECHAZADA') {
      await this.prisma.cotizaciones.update({
        where: { id_cotizacion: aprobacion.id_cotizacion ?? undefined },
        data: {
          id_estado: 1, // BORRADOR (permitir correcciones)
        },
      });

      // TODO Fase 7: Notificar solicitante con observaciones rechazo

      return {
        message: 'Aprobación procesada: RECHAZADA. Cotización vuelve a BORRADOR para correcciones',
        aprobacion: aprobacionActualizada,
        nuevo_estado: 'BORRADOR',
        observaciones_rechazo: command.observacionesAprobador,
      };
    }
  }

  // TODO Fase 7: Reintroducir validación jerárquica cuando se implemente flujo de niveles
  // private validarNivelAprobador(usuario: any, nivelRequerido: string): boolean {
  //   const nivelesAprobador = {
  //     GERENTE: ['GERENTE_GENERAL', 'GERENTE_OPERACIONES'],
  //     SUPERVISOR: ['SUPERVISOR_SERVICIO', 'COORDINADOR_OPERACIONES'],
  //   };
  //
  //   if (nivelRequerido === 'GERENTE') {
  //     return usuario.roles.some((rol: any) => nivelesAprobador.GERENTE.includes(rol.codigo_rol));
  //   }
  //
  //   if (nivelRequerido === 'SUPERVISOR') {
  //     return usuario.roles.some((rol: any) =>
  //       [...nivelesAprobador.SUPERVISOR, ...nivelesAprobador.GERENTE].includes(rol.codigo_rol)
  //     );
  //   }
  //
  //   return false;
  // }
}
