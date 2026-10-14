import { PrismaService } from '@mekanos/database';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { origen_costo_enum, Prisma } from '@prisma/client';
import { CrearProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedoresDto } from './dto/update-proveedores.dto';
import {
  HomologarArticuloProveedorDto,
  ActualizarArticuloProveedorDto,
} from './dto/homologar-articulo.dto';

@Injectable()
export class ProveedoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CrearProveedorDto, userId: number) {
    try {
      let personaId = createDto.id_persona;

      if (!personaId) {
        const nit = (createDto.numero_identificacion || '').trim();
        const razonSocial = (createDto.razon_social || createDto.nombre_comercial || '').trim();

        if (!razonSocial) {
          throw new BadRequestException('Se requiere la Razón Social o Nombre Comercial de la empresa');
        }

        // Buscar si ya existe la persona por identificación
        const personaExistente = nit
          ? await this.prisma.personas.findFirst({
              where: { numero_identificacion: nit },
              include: { proveedores: true },
            })
          : null;

        if (personaExistente) {
          if (personaExistente.proveedores) {
            throw new ConflictException(
              `La persona/empresa con identificación ${nit} ya está registrada como proveedor.`,
            );
          }
          personaId = personaExistente.id_persona;
          await this.prisma.personas.update({
            where: { id_persona: personaId },
            data: {
              es_proveedor: true,
              representante_legal: createDto.persona_contacto?.trim() || personaExistente.representante_legal,
              url_ubicacion: createDto.url_ubicacion?.trim() || personaExistente.url_ubicacion,
            },
          });
        } else {
          // Crear la persona jurídica
          const nuevaPersona = await this.prisma.personas.create({
            data: {
              tipo_identificacion: (createDto.tipo_identificacion as any) || 'NIT',
              numero_identificacion: nit || `PROV-${Date.now().toString().slice(-8)}`,
              tipo_persona: 'JURIDICA',
              nombre_completo: razonSocial,
              razon_social: razonSocial,
              nombre_comercial: createDto.nombre_comercial?.trim() || razonSocial,
              representante_legal: createDto.persona_contacto?.trim() || null,
              email_principal: createDto.email_principal?.trim() || null,
              telefono_principal: createDto.telefono_principal?.trim() || null,
              direccion_principal: createDto.direccion_principal?.trim() || null,
              url_ubicacion: createDto.url_ubicacion?.trim() || null,
              ciudad: createDto.ciudad?.trim() || 'CARTAGENA',
              es_proveedor: true,
              activo: true,
              creado_por: userId || 1,
            },
          });
          personaId = nuevaPersona.id_persona;
        }
      } else {
        // Verificar que la persona existe y no está asignada a otro proveedor
        const persona = await this.prisma.personas.findUnique({
          where: { id_persona: personaId },
          include: { proveedores: true },
        });

        if (!persona) {
          throw new NotFoundException(`Persona con ID ${personaId} no encontrada`);
        }

        if (persona.proveedores) {
          throw new ConflictException(`La persona ID ${personaId} ya está asignada como proveedor`);
        }
      }

      // Generar código de proveedor si no viene especificado
      let codigo = createDto.codigo_proveedor;
      if (!codigo) {
        const total = await this.prisma.proveedores.count();
        codigo = `PROV-${String(total + 1).padStart(4, '0')}`;
      }

      // Formatear rubros de suministro
      let rubrosStr = '';
      if (Array.isArray(createDto.rubros)) {
        rubrosStr = createDto.rubros.filter(Boolean).join(', ');
      } else if (createDto.rubros) {
        rubrosStr = String(createDto.rubros);
      }
      const serviciosOfrecidosFinal = rubrosStr || createDto.servicios_ofrecidos || null;

      // Formatear observaciones compuestas
      const obsPartes: string[] = [];
      if (createDto.terminos_credito) obsPartes.push(`Plazo de pago: ${createDto.terminos_credito}`);
      if (createDto.email_facturacion) obsPartes.push(`Facturación: ${createDto.email_facturacion}`);
      if (createDto.sitio_web) obsPartes.push(`Web: ${createDto.sitio_web}`);
      if (createDto.observaciones_despacho) obsPartes.push(`Logística: ${createDto.observaciones_despacho}`);
      if (createDto.observaciones) obsPartes.push(createDto.observaciones);
      const observacionesFinal = obsPartes.join(' | ') || null;

      // Crear el proveedor
      return await this.prisma.proveedores.create({
        data: {
          id_persona: personaId,
          codigo_proveedor: codigo,
          categoria_proveedor: (createDto.categoria_proveedor as any) || 'REPUESTOS',
          tipo_proveedor: createDto.tipo_proveedor || 'NACIONAL',
          responsable_iva: createDto.responsable_iva ?? true,
          tiempo_entrega_dias: createDto.tiempo_entrega_dias || 1,
          servicios_ofrecidos: serviciosOfrecidosFinal,
          realiza_entregas: createDto.realiza_entregas ?? true,
          zona_cobertura: createDto.etiquetas_secundarias || createDto.zona_cobertura || null,
          proveedor_activo: createDto.proveedor_activo ?? true,
          observaciones: observacionesFinal,
          creado_por: userId || 1,
        },
        include: {
          persona: true,
        },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al crear proveedor: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.proveedores.findMany({
          skip,
          take: limit,
          orderBy: { id_proveedor: 'desc' },
          include: {
            persona: true,
            _count: {
              select: {
                catalogo_componentes: true,
                articulos_proveedores: true,
                ordenes_compra: true,
              },
            },
          },
        }),
        this.prisma.proveedores.count(),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al obtener proveedores: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.proveedores.findUnique({
        where: { id_proveedor: id },
        include: {
          persona: true,
          _count: {
            select: {
              catalogo_componentes: true,
              articulos_proveedores: true,
              ordenes_compra: true,
            },
          },
        },
      });

      if (!record) {
        throw new NotFoundException(`Proveedores con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener proveedores: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: any) {
    try {
      const record = await this.findOne(id); // Verifica existencia

      // Actualizar datos de la persona si fueron suministrados
      const personaData: any = {};
      if (updateDto.razon_social !== undefined) {
        personaData.razon_social = updateDto.razon_social?.trim();
        personaData.nombre_completo = updateDto.razon_social?.trim();
        if (!updateDto.nombre_comercial) {
          personaData.nombre_comercial = updateDto.razon_social?.trim();
        }
      }
      if (updateDto.nombre_comercial !== undefined) {
        personaData.nombre_comercial = updateDto.nombre_comercial?.trim();
      }
      if (updateDto.numero_identificacion !== undefined) {
        personaData.numero_identificacion = updateDto.numero_identificacion?.trim();
      }
      if (updateDto.email_principal !== undefined) {
        personaData.email_principal = updateDto.email_principal?.trim() || null;
      }
      if (updateDto.telefono_principal !== undefined) {
        personaData.telefono_principal = updateDto.telefono_principal?.trim() || null;
      }
      if (updateDto.direccion_principal !== undefined) {
        personaData.direccion_principal = updateDto.direccion_principal?.trim() || null;
      }
      if (updateDto.url_ubicacion !== undefined) {
        personaData.url_ubicacion = updateDto.url_ubicacion?.trim() || null;
      }
      if (updateDto.persona_contacto !== undefined) {
        personaData.representante_legal = updateDto.persona_contacto?.trim() || null;
      }

      if (Object.keys(personaData).length > 0 && record.id_persona) {
        await this.prisma.personas.update({
          where: { id_persona: record.id_persona },
          data: personaData,
        });
      }

      // Preparar rubros y servicios ofrecidos
      let serviciosOfrecidosFinal = updateDto.servicios_ofrecidos;
      if (Array.isArray(updateDto.rubros)) {
        serviciosOfrecidosFinal = updateDto.rubros.filter(Boolean).join(', ');
      }

      // Formatear observaciones si vienen campos auxiliares
      let observacionesFinal = updateDto.observaciones;
      if (
        updateDto.terminos_credito ||
        updateDto.email_facturacion ||
        updateDto.sitio_web ||
        updateDto.observaciones_despacho
      ) {
        const obsPartes: string[] = [];
        if (updateDto.terminos_credito) obsPartes.push(`Plazo de pago: ${updateDto.terminos_credito}`);
        if (updateDto.email_facturacion) obsPartes.push(`Facturación: ${updateDto.email_facturacion}`);
        if (updateDto.sitio_web) obsPartes.push(`Web: ${updateDto.sitio_web}`);
        if (updateDto.observaciones_despacho) obsPartes.push(`Logística: ${updateDto.observaciones_despacho}`);
        if (updateDto.observaciones && !updateDto.observaciones.startsWith('Plazo de pago:')) {
          obsPartes.push(updateDto.observaciones);
        }
        observacionesFinal = obsPartes.join(' | ') || null;
      }

      // Preparar datos propios de proveedores
      const proveedorData: any = {};
      if (updateDto.codigo_proveedor !== undefined) proveedorData.codigo_proveedor = updateDto.codigo_proveedor;
      if (updateDto.categoria_proveedor !== undefined) proveedorData.categoria_proveedor = updateDto.categoria_proveedor;
      if (updateDto.tipo_proveedor !== undefined) proveedorData.tipo_proveedor = updateDto.tipo_proveedor;
      if (updateDto.responsable_iva !== undefined) proveedorData.responsable_iva = updateDto.responsable_iva;
      if (updateDto.tiempo_entrega_dias !== undefined) proveedorData.tiempo_entrega_dias = updateDto.tiempo_entrega_dias;
      if (serviciosOfrecidosFinal !== undefined) proveedorData.servicios_ofrecidos = serviciosOfrecidosFinal;
      if (updateDto.realiza_entregas !== undefined) proveedorData.realiza_entregas = updateDto.realiza_entregas;
      if (updateDto.etiquetas_secundarias !== undefined || updateDto.zona_cobertura !== undefined) {
        proveedorData.zona_cobertura = updateDto.etiquetas_secundarias || updateDto.zona_cobertura || null;
      }
      if (updateDto.proveedor_activo !== undefined) proveedorData.proveedor_activo = updateDto.proveedor_activo;
      if (observacionesFinal !== undefined) proveedorData.observaciones = observacionesFinal;

      return await this.prisma.proveedores.update({
        where: { id_proveedor: id },
        data: proveedorData,
        include: {
          persona: true,
          _count: {
            select: {
              catalogo_componentes: true,
              articulos_proveedores: true,
              ordenes_compra: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar proveedores: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.proveedores.delete({
        where: { id_proveedor: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar proveedores: ${(error as Error).message}`,
      );
    }
  }

  /**
   * =========================================================================
   * FICHA 360° DEL PROVEEDOR (DATOS CONSOLIDADOS Y KPIS OPERATIVOS)
   * =========================================================================
   */
  async getFicha360(id: number) {
    const proveedor = await this.findOne(id);

    // Contar repuestos homologados activos
    const totalRepuestos = await this.prisma.articulos_proveedores.count({
      where: { id_proveedor: id, activo: true },
    });

    // Consultar órdenes de compra para KPIs financieros y logísticos
    const ordenes = await this.prisma.ordenes_compra.findMany({
      where: { id_proveedor: id },
      include: {
        ordenes_compra_detalle: {
          select: { subtotal: true, cantidad: true, precio_unitario: true },
        },
      },
      orderBy: { id_orden_compra: 'desc' },
    });

    let montoComprometido = 0;
    let montoEnBorrador = 0;
    let ordenesCompletadas = 0;

    for (const o of ordenes) {
      const estadoStr = String(o.estado || '').toUpperCase();
      let totalOrden = 0;
      for (const d of o.ordenes_compra_detalle) {
        const sub = d.subtotal ? Number(d.subtotal) : Number(d.cantidad) * Number(d.precio_unitario);
        totalOrden += sub;
      }

      // Solo sumar a volumen comprometido órdenes emitidas firmes (excluyendo estrictamente BORRADOR y CANCELADA/ANULADA)
      if (['ENVIADA', 'PARCIAL', 'COMPLETADA', 'RECIBIDA'].includes(estadoStr)) {
        montoComprometido += totalOrden;
      } else if (estadoStr === 'BORRADOR') {
        montoEnBorrador += totalOrden;
      }

      if (['COMPLETADA', 'RECIBIDA'].includes(estadoStr)) {
        ordenesCompletadas++;
      }
    }

    // Consultar recepciones físicas en muelle (recepciones_compra) para este proveedor
    const recepciones = await this.prisma.recepciones_compra.findMany({
      where: {
        ordenes_compra: {
          id_proveedor: id,
        },
      },
      select: {
        cantidad_recibida: true,
        cantidad_aceptada: true,
      },
    });

    let totalRecibidoMuelle = 0;
    let totalAceptadoMuelle = 0;

    for (const r of recepciones) {
      totalRecibidoMuelle += Number(r.cantidad_recibida || 0);
      totalAceptadoMuelle += Number(r.cantidad_aceptada || 0);
    }

    // Cumplimiento en muelle determinista: (Unidades Aceptadas / Total Unidades Recibidas) * 100
    // Si no registra recepciones físicas, se retorna null (Sin evaluar / Sin recepciones)
    const cumplimientoMuelle = totalRecibidoMuelle > 0
      ? Math.round((totalAceptadoMuelle / totalRecibidoMuelle) * 100)
      : null;

    return {
      proveedor,
      kpis: {
        total_articulos_homologados: totalRepuestos,
        total_ordenes_compra: ordenes.length,
        monto_total_comprado: montoComprometido,
        monto_en_borrador: montoEnBorrador,
        cumplimiento_calidad: cumplimientoMuelle,
        total_recepciones: recepciones.length,
      },
      ordenes_recientes: ordenes.slice(0, 5),
    };
  }

  /**
   * =========================================================================
   * CATÁLOGO DE REPUESTOS HOMOLOGADOS DEL PROVEEDOR (MATRIZ DE SOURCING)
   * =========================================================================
   */
  async getArticulosProveedor(id: number, search?: string) {
    await this.findOne(id); // Valida existencia

    const where: Prisma.articulos_proveedoresWhereInput = {
      id_proveedor: id,
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { referencia_proveedor: { contains: q, mode: 'insensitive' } },
        { nombre_segun_proveedor: { contains: q, mode: 'insensitive' } },
        { marca_ofrecida: { contains: q, mode: 'insensitive' } },
        {
          catalogo_componentes: {
            OR: [
              { descripcion_corta: { contains: q, mode: 'insensitive' } },
              { referencia_fabricante: { contains: q, mode: 'insensitive' } },
              { codigo_interno: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    return await this.prisma.articulos_proveedores.findMany({
      where,
      include: {
        catalogo_componentes: {
          include: {
            marcas: true,
            categorias_componente: true,
            unidades_medida: true,
          },
        },
        marcas: true,
      },
      orderBy: [
        { es_proveedor_preferido: 'desc' },
        { fecha_actualizacion: 'desc' },
      ],
    });
  }

  /**
   * =========================================================================
   * HOMOLOGAR / VINCULAR ARTÍCULO A LA MATRIZ DE SOURCING DEL PROVEEDOR
   * =========================================================================
   */
  async homologarArticulo(
    idProveedor: number,
    dto: HomologarArticuloProveedorDto,
    userId?: number,
  ) {
    await this.findOne(idProveedor);

    const componente = await this.prisma.catalogo_componentes.findUnique({
      where: { id_componente: dto.id_componente },
    });

    if (!componente) {
      throw new NotFoundException(`El artículo ID ${dto.id_componente} no existe en el catálogo maestro.`);
    }

    const ref = dto.referencia_proveedor.trim();
    if (!ref) {
      throw new BadRequestException('La referencia comercial del proveedor es obligatoria.');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Si se marca como preferido, desmarcar otros proveedores para este componente
      if (dto.es_proveedor_preferido) {
        await tx.articulos_proveedores.updateMany({
          where: { id_componente: dto.id_componente },
          data: { es_proveedor_preferido: false },
        });
        await tx.catalogo_componentes.update({
          where: { id_componente: dto.id_componente },
          data: {
            id_proveedor_principal: idProveedor,
            precio_compra: new Prisma.Decimal(dto.costo_actual),
            modificado_por: userId || null,
          },
        });
      }

      // Upsert atómico en articulos_proveedores con estructura de datos completa
      const vinculo = await tx.articulos_proveedores.upsert({
        where: {
          id_componente_id_proveedor: {
            id_componente: dto.id_componente,
            id_proveedor: idProveedor,
          },
        },
        create: {
          id_componente: dto.id_componente,
          id_proveedor: idProveedor,
          referencia_proveedor: ref,
          nombre_segun_proveedor: dto.nombre_segun_proveedor?.trim() || null,
          marca_ofrecida: dto.marca_ofrecida?.trim() || componente.marca || null,
          id_marca_ofrecida: dto.id_marca_ofrecida || null,
          costo_actual: new Prisma.Decimal(dto.costo_actual),
          moneda: 'COP',
          tiempo_entrega_dias: dto.tiempo_entrega_dias ?? 1,
          cantidad_minima_compra: dto.cantidad_minima_compra !== undefined ? new Prisma.Decimal(dto.cantidad_minima_compra) : new Prisma.Decimal(1),
          url_producto_proveedor: dto.url_producto_proveedor?.trim() || null,
          es_proveedor_preferido: dto.es_proveedor_preferido ?? false,
          activo: true,
          notas: dto.notas?.trim() || null,
          registrado_por: userId || null,
        },
        update: {
          referencia_proveedor: ref,
          nombre_segun_proveedor: dto.nombre_segun_proveedor !== undefined ? dto.nombre_segun_proveedor.trim() || null : undefined,
          marca_ofrecida: dto.marca_ofrecida?.trim() || componente.marca || null,
          id_marca_ofrecida: dto.id_marca_ofrecida || undefined,
          costo_actual: new Prisma.Decimal(dto.costo_actual),
          tiempo_entrega_dias: dto.tiempo_entrega_dias ?? 1,
          cantidad_minima_compra: dto.cantidad_minima_compra !== undefined ? new Prisma.Decimal(dto.cantidad_minima_compra) : undefined,
          url_producto_proveedor: dto.url_producto_proveedor?.trim() || null,
          es_proveedor_preferido: dto.es_proveedor_preferido ?? false,
          activo: true,
          notas: dto.notas?.trim() || null,
          modificado_por: userId || null,
        },
        include: {
          catalogo_componentes: {
            include: {
              marcas: true,
              categorias_componente: true,
            },
          },
        },
      });

      // Bitácora inmutable en historial_costos_compra
      await tx.historial_costos_compra.create({
        data: {
          id_componente: dto.id_componente,
          id_proveedor: idProveedor,
          costo_unitario: new Prisma.Decimal(dto.costo_actual),
          moneda: 'COP',
          origen_cambio: origen_costo_enum.ACTUALIZACION_PROVEEDOR,
          observaciones:
            dto.notas?.trim() ||
            `Homologación directa desde Ficha Proveedor #${idProveedor} con ref ${ref}${dto.nombre_segun_proveedor ? ` ("${dto.nombre_segun_proveedor.trim()}")` : ''}`,
          id_usuario: userId || null,
        },
      });

      return vinculo;
    });
  }

  /**
   * =========================================================================
   * ACTUALIZAR ARTÍCULO HOMOLOGADO EN LA MATRIZ DE SOURCING
   * =========================================================================
   */
  async actualizarArticuloHomologado(
    idProveedor: number,
    idComponente: number,
    dto: ActualizarArticuloProveedorDto,
    userId?: number,
  ) {
    const vinculoExistente = await this.prisma.articulos_proveedores.findUnique({
      where: {
        id_componente_id_proveedor: {
          id_componente: idComponente,
          id_proveedor: idProveedor,
        },
      },
    });

    if (!vinculoExistente) {
      throw new NotFoundException(
        `El artículo ID ${idComponente} no está homologado con el proveedor ID ${idProveedor}.`,
      );
    }

    const costoAnterior = Number(vinculoExistente.costo_actual);
    const nuevoCosto = dto.nuevo_costo !== undefined ? Number(dto.nuevo_costo) : costoAnterior;
    let porcentajeVariacion = 0;

    if (costoAnterior > 0 && dto.nuevo_costo !== undefined) {
      porcentajeVariacion = ((nuevoCosto - costoAnterior) / costoAnterior) * 100;
      porcentajeVariacion = Math.round(porcentajeVariacion * 100) / 100;
    }

    return await this.prisma.$transaction(async (tx) => {
      const esPreferido =
        dto.es_proveedor_preferido !== undefined
          ? dto.es_proveedor_preferido
          : vinculoExistente.es_proveedor_preferido;

      if (dto.es_proveedor_preferido === true) {
        await tx.articulos_proveedores.updateMany({
          where: { id_componente: idComponente },
          data: { es_proveedor_preferido: false },
        });
      }

      const vinculoActualizado = await tx.articulos_proveedores.update({
        where: {
          id_componente_id_proveedor: {
            id_componente: idComponente,
            id_proveedor: idProveedor,
          },
        },
        data: {
          referencia_proveedor: dto.referencia_proveedor?.trim() || vinculoExistente.referencia_proveedor,
          nombre_segun_proveedor: dto.nombre_segun_proveedor !== undefined ? (dto.nombre_segun_proveedor.trim() || null) : vinculoExistente.nombre_segun_proveedor,
          marca_ofrecida: dto.marca_ofrecida !== undefined ? (dto.marca_ofrecida.trim() || null) : vinculoExistente.marca_ofrecida,
          id_marca_ofrecida: dto.id_marca_ofrecida !== undefined ? dto.id_marca_ofrecida : vinculoExistente.id_marca_ofrecida,
          cantidad_minima_compra: dto.cantidad_minima_compra !== undefined ? new Prisma.Decimal(dto.cantidad_minima_compra) : vinculoExistente.cantidad_minima_compra,
          costo_actual: new Prisma.Decimal(nuevoCosto),
          tiempo_entrega_dias: dto.tiempo_entrega_dias !== undefined ? dto.tiempo_entrega_dias : vinculoExistente.tiempo_entrega_dias,
          es_proveedor_preferido: esPreferido,
          url_producto_proveedor: dto.url_producto_proveedor !== undefined ? (dto.url_producto_proveedor.trim() || null) : vinculoExistente.url_producto_proveedor,
          notas: dto.observaciones !== undefined ? (dto.observaciones.trim() || null) : vinculoExistente.notas,
          modificado_por: userId || null,
        },
        include: {
          catalogo_componentes: {
            include: {
              marcas: true,
              categorias_componente: true,
            },
          },
        },
      });

      if (esPreferido) {
        await tx.catalogo_componentes.update({
          where: { id_componente: idComponente },
          data: {
            id_proveedor_principal: idProveedor,
            precio_compra: new Prisma.Decimal(nuevoCosto),
            modificado_por: userId || null,
          },
        });
      }

      // Bitácora inmutable si cambió el costo
      if (dto.nuevo_costo !== undefined && nuevoCosto !== costoAnterior) {
        await tx.historial_costos_compra.create({
          data: {
            id_componente: idComponente,
            id_proveedor: idProveedor,
            costo_unitario: new Prisma.Decimal(nuevoCosto),
            costo_unitario_anterior: new Prisma.Decimal(costoAnterior),
            porcentaje_variacion: new Prisma.Decimal(porcentajeVariacion),
            moneda: 'COP',
            origen_cambio: origen_costo_enum.ACTUALIZACION_PROVEEDOR,
            observaciones:
              dto.observaciones?.trim() ||
              `Ajuste de homologación desde Ficha Proveedor #${idProveedor} de ${costoAnterior} a ${nuevoCosto}`,
            id_usuario: userId || null,
          },
        });
      }

      return {
        vinculo: vinculoActualizado,
        variacion_porcentual: porcentajeVariacion,
      };
    });
  }

  /**
   * =========================================================================
   * DESVINCULAR ARTÍCULO DE LA MATRIZ DE SOURCING
   * =========================================================================
   */
  async desvincularArticulo(idProveedor: number, idComponente: number) {
    const vinculo = await this.prisma.articulos_proveedores.findUnique({
      where: {
        id_componente_id_proveedor: {
          id_componente: idComponente,
          id_proveedor: idProveedor,
        },
      },
    });

    if (!vinculo) {
      throw new NotFoundException('Vínculo no encontrado en la matriz de abastecimiento.');
    }

    return await this.prisma.articulos_proveedores.delete({
      where: {
        id_componente_id_proveedor: {
          id_componente: idComponente,
          id_proveedor: idProveedor,
        },
      },
    });
  }

  /**
   * =========================================================================
   * HISTORIAL DE ÓRDENES DE COMPRA DEL PROVEEDOR
   * =========================================================================
   */
  async getOrdenesProveedor(id: number) {
    await this.findOne(id);

    return await this.prisma.ordenes_compra.findMany({
      where: { id_proveedor: id },
      include: {
        ordenes_compra_detalle: {
          include: {
            catalogo_componentes: {
              select: {
                id_componente: true,
                descripcion_corta: true,
                codigo_interno: true,
                referencia_fabricante: true,
              },
            },
          },
        },
      },
      orderBy: [
        { fecha_solicitud: 'desc' },
        { id_orden_compra: 'desc' },
      ],
    });
  }
}

