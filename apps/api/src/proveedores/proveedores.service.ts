import { PrismaService } from '@mekanos/database';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { CrearProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedoresDto } from './dto/update-proveedores.dto';

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

  async update(id: number, updateDto: UpdateProveedoresDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.proveedores.update({
        where: { id_proveedor: id },
        data: updateDto as any,
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
}
