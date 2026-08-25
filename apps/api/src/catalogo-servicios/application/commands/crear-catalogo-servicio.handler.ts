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
    // 1. Normalizar o auto-generar código
    let codigoNormalizado = (command.codigoServicio || '').toUpperCase().trim();
    if (!codigoNormalizado) {
      codigoNormalizado = this.generarCodigo(command.nombreServicio, command.categoria);
    }

    // 2. Validar o resolver unicidad de código
    let existente = await this.repository.findByCodigo(codigoNormalizado);
    if (existente) {
      if (!command.codigoServicio || command.codigoServicio.trim() === '') {
        // Si fue auto-generado, añadir sufijo numérico único
        let counter = 2;
        let candidate = `${codigoNormalizado}-${String(counter).padStart(2, '0')}`;
        while (await this.repository.findByCodigo(candidate)) {
          counter++;
          candidate = `${codigoNormalizado}-${String(counter).padStart(2, '0')}`;
        }
        codigoNormalizado = candidate;
      } else {
        throw new ConflictException(`Código de servicio '${codigoNormalizado}' ya existe`);
      }
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
      tipos_servicio: command.tipoServicioId ? { connect: { id_tipo_servicio: command.tipoServicioId } } : undefined,
      tipos_equipo: command.tipoEquipoId ? { connect: { id_tipo_equipo: command.tipoEquipoId } } : undefined,
      duracion_estimada_horas: command.duracionEstimadaHoras,
      requiere_certificacion: command.requiereCertificacion ?? false,
      tipo_certificacion_requerida: command.tipoCertificacionRequerida?.trim(),
      precio_base: command.precioBase,
      incluye_repuestos: command.incluyeRepuestos ?? false,
      activo: command.activo ?? true,
      observaciones: command.observaciones?.trim(),
      creado_por: command.creadoPor,
    });
  }

  private generarCodigo(nombre: string, categoria?: string): string {
    const cleanNombre = (nombre || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const actionMap: [RegExp, string][] = [
      [/REEMPLAZ|CAMBI|SUSTITU/i, 'CAMB'],
      [/REPARAC|REPARAR|ARREGL/i, 'REP'],
      [/REVISI|INSPECC|EVALUA/i, 'REV'],
      [/SUMINISTR|ENTREGA|DOTAC/i, 'SUM'],
      [/INSTALAC|MONTAJE/i, 'INST'],
      [/CALIBRAC|AJUSTE|SINCRONIZ/i, 'CALIB'],
      [/LIMPIEZA|LAVAD|DESENGRAS/i, 'LIMP'],
      [/DIAGNOST|ESCANEO|ANALIS/i, 'DIAG'],
      [/MANTENIMIENTO|RUTINA/i, 'MNT'],
      [/PRUEBA|TESTEO|MEDIC/i, 'PRB'],
      [/REBOBINAD|EMBOBINAD/i, 'REBOB'],
      [/PROGRAMAC|CONFIGURAC/i, 'PROG'],
    ];

    const nounMap: [RegExp, string][] = [
      [/MODULO|CONTROLADOR|CONTROL|DEEP\s*SEA|COMAP/i, 'MOD-CTRL'],
      [/FILTRO.*AIRE/i, 'FILT-AIRE'],
      [/FILTRO.*ACEITE/i, 'FILT-ACTE'],
      [/FILTRO.*COMBUSTIBLE|FILTRO.*ACPM|FILTRO.*DIESEL/i, 'FILT-COMB'],
      [/FILTRO.*RACOR|TRAMPA.*AGUA/i, 'FILT-RACOR'],
      [/FILTRO/i, 'FILTRO'],
      [/ACEITE|LUBRICANTE/i, 'LUB-ACTE'],
      [/REFRIGERANTE|ANTICONGELANTE/i, 'REFRIG'],
      [/INYECTOR/i, 'INYECT'],
      [/BOMBA.*INYEC/i, 'BOM-INY'],
      [/BOMBA.*AGUA/i, 'BOM-AGUA'],
      [/BOMBA/i, 'BOMBA'],
      [/SENSOR.*PRES/i, 'SENS-PRES'],
      [/SENSOR.*TEMP/i, 'SENS-TEMP'],
      [/SENSOR/i, 'SENSOR'],
      [/ALTERNADOR/i, 'ALT'],
      [/MOTOR.*ARRANQUE|STARTER/i, 'ARRANQ'],
      [/BATERIA/i, 'BAT'],
      [/CARGADOR.*BATER/i, 'CARG-BAT'],
      [/CORREA/i, 'CORREA'],
      [/RADIADOR/i, 'RADIAD'],
      [/TRANSFERENCIA|ATS/i, 'ATS'],
      [/PLANTA|GENERADOR/i, 'GEN'],
      [/TANQUE|COMBUSTIBLE/i, 'COMB'],
    ];

    const prefix = categoria === 'CORRECTIVO' ? 'CORR' : categoria === 'PREVENTIVO' ? 'PREV' : 'SRV';

    let action = '';
    for (const [regex, code] of actionMap) {
      if (regex.test(cleanNombre)) {
        action = code;
        break;
      }
    }

    let noun = '';
    for (const [regex, code] of nounMap) {
      if (regex.test(cleanNombre)) {
        noun = code;
        break;
      }
    }

    if (!action && !noun) {
      const words = cleanNombre
        .replace(/[^A-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => !['DE', 'DEL', 'LA', 'EL', 'Y', 'EN', 'PARA', 'CON', 'A', 'LOS', 'LAS', 'UN', 'UNA', 'AL'].includes(w));
      action = words.slice(0, 3).map((w) => w.substring(0, 4)).join('-');
    }

    const baseParts = [prefix, action, noun].filter(Boolean);
    return baseParts.join('-');
  }
}
