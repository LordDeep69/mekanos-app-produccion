/**
 * PDF Controller - MEKANOS S.A.S
 * 
 * Endpoints para generación de PDFs:
 * - GET /ordenes/:id/pdf - Genera PDF de una orden específica
 * - GET /pdf/prueba - Genera PDF de prueba
 */

import { PrismaService } from '@mekanos/database';
import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Query,
  Res
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { PdfService, TipoInforme } from './pdf.service';
import { DatosOrdenPDF } from './templates';

@ApiTags('PDF')
@Controller()
@ApiBearerAuth()
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(
    private readonly pdfService: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Genera PDF de una orden de servicio
   */
  @Get('ordenes/:id/pdf')
  @ApiOperation({
    summary: 'Generar PDF de orden de servicio',
    description: 'Genera un PDF profesional MEKANOS con el informe de mantenimiento',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de servicio',
    type: String,
  })
  @ApiQuery({
    name: 'tipo',
    description: 'Tipo de informe (GENERADOR_A, GENERADOR_B, BOMBA_A)',
    required: false,
    enum: ['GENERADOR_A', 'GENERADOR_B', 'BOMBA_A'],
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generado exitosamente',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async generarPdfOrden(
    @Param('id') id: string,
    @Query('tipo') tipo: TipoInforme = 'GENERADOR_A',
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`📄 Generando PDF para orden ${id}, tipo ${tipo}`);

    // Convertir ID a número
    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      throw new NotFoundException(`ID de orden inválido: ${id}`);
    }

    // Buscar la orden con todas las relaciones necesarias
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idNumerico },
      include: {
        equipo: {
          include: {
            tipo_equipo: true,
            equipos_generador: true,
            equipos_motor: true,
            equipos_bomba: true,
          },
        },
        cliente: {
          include: {
            persona: true,
          },
        },
        estado: true,
        tecnico: {
          include: {
            persona: true,
          },
        },
        tipo_servicio: true,
        actividades_ejecutadas: {
          include: {
            catalogo_actividades: {
              include: {
                catalogo_sistemas: true,
              },
            },
          },
        },
        mediciones_servicio: {
          include: {
            parametros_medicion: true,
          },
        },
        evidencias_fotograficas: true,
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    // Construir datos para el PDF
    const clientePersona = orden.cliente?.persona;
    const clienteNombre = clientePersona?.razon_social || clientePersona?.nombre_comercial || clientePersona?.nombre_completo || 'N/A';
    const clienteDireccion = clientePersona?.direccion_principal || orden.direccion_servicio || 'N/A';
    
    // Obtener marca y serie según tipo de equipo
    let marcaEquipo = 'N/A';
    let serieEquipo = 'N/A';
    if (orden.equipo) {
      if (orden.equipo.equipos_generador) {
        marcaEquipo = orden.equipo.equipos_generador.marca_generador || 'N/A';
        serieEquipo = orden.equipo.equipos_generador.numero_serie_generador || orden.equipo.numero_serie_equipo || 'N/A';
      } else if (orden.equipo.equipos_motor) {
        marcaEquipo = orden.equipo.equipos_motor.marca_motor || 'N/A';
        serieEquipo = orden.equipo.equipos_motor.numero_serie_motor || orden.equipo.numero_serie_equipo || 'N/A';
      } else if (orden.equipo.equipos_bomba) {
        marcaEquipo = orden.equipo.equipos_bomba.marca_bomba || 'N/A';
        serieEquipo = orden.equipo.equipos_bomba.numero_serie_bomba || orden.equipo.numero_serie_equipo || 'N/A';
      } else {
        marcaEquipo = orden.equipo.nombre_equipo || 'N/A';
        serieEquipo = orden.equipo.numero_serie_equipo || 'N/A';
      }
    }

    const datosOrden: DatosOrdenPDF = {
      cliente: clienteNombre,
      direccion: clienteDireccion,
      marcaEquipo: marcaEquipo,
      serieEquipo: serieEquipo,
      tipoEquipo: this.mapTipoEquipo(orden.equipo?.tipo_equipo?.nombre || ''),
      fecha: orden.fecha_programada 
        ? new Date(orden.fecha_programada).toLocaleDateString('es-CO') 
        : new Date().toLocaleDateString('es-CO'),
      tecnico: orden.tecnico?.persona 
        ? `${orden.tecnico.persona.primer_nombre || ''} ${orden.tecnico.persona.primer_apellido || ''}`.trim() || 'N/A'
        : 'N/A',
      horaEntrada: orden.hora_inicio || orden.fecha_inicio_real ? new Date(orden.fecha_inicio_real).toLocaleTimeString('es-CO') : 'N/A',
      horaSalida: orden.hora_fin || orden.fecha_fin_real ? new Date(orden.fecha_fin_real).toLocaleTimeString('es-CO') : 'N/A',
      tipoServicio: orden.tipo_servicio?.nombre_tipo || 'PREVENTIVO_A',
      numeroOrden: orden.numero_orden || `ORD-${id.substring(0, 8)}`,
      datosModulo: this.extraerDatosModulo(orden.mediciones_servicio),
      actividades: orden.actividades_ejecutadas?.map(act => ({
        sistema: act.catalogo_actividades?.catalogo_sistemas?.nombre || 'GENERAL',
        descripcion: act.catalogo_actividades?.nombre_actividad || act.descripcion || 'N/A',
        resultado: (act.estado_checklist as any) || 'NA',
        observaciones: act.observaciones || '',
      })) || [],
      mediciones: orden.mediciones_servicio?.map(med => ({
        parametro: med.parametros_medicion?.nombre_parametro || 'N/A',
        valor: Number(med.valor_medido) || 0,
        unidad: med.parametros_medicion?.unidad_medida || '',
        nivelAlerta: (med.nivel_alerta as any) || 'OK',
      })) || [],
      evidencias: orden.evidencias_fotograficas?.map(ev => ev.ruta_archivo) || [],
      observaciones: orden.observaciones || '',
    };

    // Determinar tipo de informe si no se especificó
    if (!tipo && orden.equipo?.tipo_equipo?.nombre) {
      tipo = this.pdfService.determinarTipoInforme(
        this.mapTipoEquipo(orden.equipo.tipo_equipo.nombre),
        'PREVENTIVO_A',
      );
    }

    // Generar PDF
    const resultado = await this.pdfService.generarPDF({
      tipoInforme: tipo,
      datos: datosOrden,
    });

    // Enviar respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
    res.setHeader('Content-Length', resultado.size);
    res.status(HttpStatus.OK).send(resultado.buffer);
  }

  /**
   * Genera PDF de una cotización comercial
   */
  @Get('cotizaciones/:id/pdf')
  @ApiOperation({
    summary: 'Generar PDF de cotización',
    description: 'Genera un PDF profesional MEKANOS con la cotización comercial',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cotización',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generado exitosamente',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  async generarPdfCotizacion(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`📄 Generando PDF para cotización ${id}`);

    // Convertir ID a número
    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      throw new NotFoundException(`ID de cotización inválido: ${id}`);
    }

    // Buscar la cotización con todas las relaciones necesarias
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idNumerico },
      include: {
        cliente: {
          include: {
            persona: true,
          },
        },
        empleados: {
          include: {
            persona: true,
          },
        },
        estado: true,
        items_servicios: {
          include: {
            servicio: true,
          },
        },
        items_componentes: {
          include: {
            catalogo_componentes: true,
          },
        },
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }

    // Calcular totales si no están calculados
    const subtotalServicios = cotizacion.items_servicios?.reduce(
      (acc, item) => acc + (Number(item.subtotal) || 0), 0
    ) || 0;
    
    const subtotalComponentes = cotizacion.items_componentes?.reduce(
      (acc, item) => acc + (Number(item.subtotal) || 0), 0
    ) || 0;

    const subtotalGeneral = subtotalServicios + subtotalComponentes;
    const descuentoMonto = Number(cotizacion.descuento_valor) || 0;
    const baseImponible = subtotalGeneral - descuentoMonto;
    const ivaPorcentaje = Number(cotizacion.iva_porcentaje) || 19;
    const ivaMonto = Number(cotizacion.iva_valor) || (baseImponible * ivaPorcentaje / 100);
    const total = Number(cotizacion.total_cotizacion) || (baseImponible + ivaMonto);

    // Obtener datos de la persona cliente
    const clientePersona = cotizacion.cliente?.persona;
    
    // Obtener datos del empleado que elaboró
    const empleadoPersona = cotizacion.empleados?.persona;

    // Construir datos para el PDF
    const datosCotizacion = {
      numeroCotizacion: cotizacion.numero_cotizacion || `COT-${id}`,
      fecha: cotizacion.fecha_cotizacion
        ? new Date(cotizacion.fecha_cotizacion).toLocaleDateString('es-CO')
        : new Date().toLocaleDateString('es-CO'),
      validezDias: cotizacion.dias_validez || 30,

      cliente: {
        nombre: clientePersona?.razon_social || clientePersona?.nombre_comercial || clientePersona?.nombre_completo || 'N/A',
        nit: clientePersona?.numero_identificacion || 'N/A',
        direccion: clientePersona?.direccion_principal || 'N/A',
        telefono: clientePersona?.telefono_principal || clientePersona?.celular || 'N/A',
        email: clientePersona?.email_principal || 'N/A',
        contacto: 'N/A', // Se podría agregar campo de contacto en cotización
      },

      vendedor: {
        nombre: empleadoPersona
          ? `${empleadoPersona.primer_nombre || ''} ${empleadoPersona.primer_apellido || ''}`.trim()
          : 'N/A',
        cargo: 'Asesor Comercial',
        telefono: empleadoPersona?.celular || empleadoPersona?.telefono_principal || 'N/A',
        email: empleadoPersona?.email_principal || 'N/A',
      },

      servicios: cotizacion.items_servicios?.map(item => ({
        descripcion: item.descripcion_personalizada || item.servicio?.nombre_servicio || 'Servicio',
        cantidad: Number(item.cantidad) || 1,
        precioUnitario: Number(item.precio_unitario) || 0,
        descuento: Number(item.descuento_porcentaje) || 0,
        subtotal: Number(item.subtotal) || 0,
      })) || [],

      componentes: cotizacion.items_componentes?.map(item => ({
        codigo: item.catalogo_componentes?.codigo_interno || item.referencia_manual || 'N/A',
        descripcion: item.descripcion || item.catalogo_componentes?.descripcion_corta || 'Componente',
        cantidad: Number(item.cantidad) || 1,
        precioUnitario: Number(item.precio_unitario) || 0,
        descuento: Number(item.descuento_porcentaje) || 0,
        subtotal: Number(item.subtotal) || 0,
      })) || [],

      subtotalServicios,
      subtotalComponentes,
      subtotalGeneral,
      descuentoGlobal: {
        tipo: 'valor' as const,
        valor: descuentoMonto,
        monto: descuentoMonto,
      },
      baseImponible,
      iva: {
        porcentaje: ivaPorcentaje,
        monto: ivaMonto,
      },
      total,

      formaPago: cotizacion.forma_pago || 'Contado',
      tiempoEntrega: cotizacion.tiempo_estimado_dias ? `${cotizacion.tiempo_estimado_dias} días` : 'Por confirmar',
      garantia: cotizacion.meses_garantia ? `${cotizacion.meses_garantia} meses - ${cotizacion.observaciones_garantia || 'Garantía estándar'}` : 'Garantía estándar',
      notas: cotizacion.terminos_condiciones || '',
      estado: cotizacion.estado?.nombre_estado || 'BORRADOR',
    };

    // Generar PDF
    const resultado = await this.pdfService.generarPDFCotizacion(datosCotizacion);

    // Enviar respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
    res.setHeader('Content-Length', resultado.size);
    res.status(HttpStatus.OK).send(resultado.buffer);
  }

  /**
   * Genera un PDF de cotización de prueba
   */
  @Get('pdf/cotizacion/prueba')
  @ApiOperation({
    summary: 'Generar PDF de cotización de prueba',
    description: 'Genera un PDF de cotización de ejemplo con datos ficticios',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF de cotización de prueba generado',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async generarPdfCotizacionPrueba(@Res() res: Response): Promise<void> {
    this.logger.log('🧪 Generando PDF de cotización de prueba...');

    const resultado = await this.pdfService.generarPDFCotizacionPrueba();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
    res.setHeader('Content-Length', resultado.size);
    res.status(HttpStatus.OK).send(resultado.buffer);
  }

  /**
   * Genera un PDF de prueba
   */
  @Get('pdf/prueba')
  @ApiOperation({
    summary: 'Generar PDF de prueba',
    description: 'Genera un PDF de ejemplo con datos ficticios para verificar el funcionamiento',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF de prueba generado',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async generarPdfPrueba(@Res() res: Response): Promise<void> {
    this.logger.log('🧪 Generando PDF de prueba...');

    const resultado = await this.pdfService.generarPDFPrueba();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
    res.setHeader('Content-Length', resultado.size);
    res.status(HttpStatus.OK).send(resultado.buffer);
  }

  /**
   * Mapea el nombre del tipo de equipo a la enum
   */
  private mapTipoEquipo(nombre: string | undefined): 'GENERADOR' | 'BOMBA' | 'MOTOR' {
    if (!nombre) return 'GENERADOR';
    
    const nombreUpper = nombre.toUpperCase();
    if (nombreUpper.includes('BOMBA')) return 'BOMBA';
    if (nombreUpper.includes('MOTOR')) return 'MOTOR';
    return 'GENERADOR';
  }

  /**
   * Extrae datos del módulo de control de las mediciones
   */
  private extraerDatosModulo(mediciones: any[]): DatosOrdenPDF['datosModulo'] {
  }
}
