/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVICIO: UsuariosGestionService - ORQUESTADOR DE GESTIÓN COMPLETA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servicio implementa el PATRÓN FACADE para la gestión unificada de usuarios.
 * Orquesta la creación atómica de:
 *   1. Persona (con Identity Resolution)
 *   2. Usuario (con hash de password)
 *   3. Empleado (opcional)
 *   4. Asignación de Roles (N:N)
 * 
 * TODO en UNA SOLA TRANSACCIÓN - Si algo falla, ROLLBACK total.
 * 
 * PRINCIPIOS CLAVE:
 *   - Identity Resolution: Si persona ya existe (por cédula/email), reutilizar
 *   - Generación segura de passwords temporales
 *   - Validación de unicidad (username, email)
 *   - Logs detallados para auditoría
 * 
 * @author GitHub Copilot (Claude Opus 4.5)
 * @date 2025-12-23
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  cargo_empleado_enum,
  estado_usuario_enum,
  nivel_academico_enum,
  Prisma,
  tipo_contrato_empleado_enum
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import {
  BuscarPersonaDto,
  CreateUsuarioCompletoDto,
  DatosPersonaDto,
  PersonaExistenteResponse,
  UsuarioCompletoResponse,
} from './dto/create-usuario-completo.dto';

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICIO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class UsuariosGestionService {
  private readonly logger = new Logger(UsuariosGestionService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Normaliza el username para cumplir con las restricciones de BD (sin espacios, sin acentos)
   */
  private normalizarUsername(username: string): string {
    return username
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/\s+/g, '.') // Cambiar espacios por puntos
      .replace(/[^a-z0-9._-]/g, ''); // Solo permitir alfanuméricos y . _ -
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MÉTODO PRINCIPAL: CREAR USUARIO COMPLETO
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Crea un usuario completo con todos sus datos asociados
   * en una ÚNICA transacción atómica.
   * 
   * Flujo:
   *   1. Identity Resolution (buscar persona existente)
   *   2. Validar unicidad username/email
   *   3. Crear/Reutilizar Persona
   *   4. Crear Usuario con password hasheado
   *   5. Crear Empleado (si aplica)
   *   6. Asignar Roles
   * 
   * @throws ConflictException si username/email ya existen
   * @throws BadRequestException si datos inválidos
   */
  async crearUsuarioCompleto(
    dto: CreateUsuarioCompletoDto,
  ): Promise<UsuarioCompletoResponse> {
    const usernameNormalizado = this.normalizarUsername(dto.datosUsuario.username);

    this.logger.log('═══════════════════════════════════════════════════════════');
    this.logger.log('INICIANDO CREACIÓN DE USUARIO COMPLETO');
    this.logger.log(`Username solicitado: ${dto.datosUsuario.username}`);
    this.logger.log(`Username normalizado: ${usernameNormalizado}`);
    this.logger.log(`Persona: ${dto.datosPersona.numero_identificacion}`);
    this.logger.log('═══════════════════════════════════════════════════════════');

    let passwordTemporal: string | undefined;
    let personaReutilizada = false;

    try {
      // ─────────────────────────────────────────────────────────────────────────
      // FASE 1: VALIDACIONES PRE-TRANSACCIÓN
      // ─────────────────────────────────────────────────────────────────────────

      // 1.1 Validar que username no exista
      const usernameExiste = await this.prisma.usuarios.findFirst({
        where: {
          username: {
            equals: usernameNormalizado,
            mode: 'insensitive',
          },
        },
      });

      if (usernameExiste) {
        throw new ConflictException(
          `El username "${usernameNormalizado}" ya está en uso`,
        );
      }

      // 1.2 Determinar email del usuario
      const emailUsuario =
        dto.datosUsuario.email || dto.datosPersona.email_principal;

      if (!emailUsuario) {
        throw new BadRequestException(
          'Se requiere un email (en datosUsuario.email o datosPersona.email_principal)',
        );
      }

      // 1.3 Validar que email no exista en usuarios
      const emailExiste = await this.prisma.usuarios.findFirst({
        where: {
          email: {
            equals: emailUsuario,
            mode: 'insensitive',
          },
        },
      });

      if (emailExiste) {
        throw new ConflictException(
          `El email "${emailUsuario}" ya está registrado como usuario`,
        );
      }

      // 1.4 Validar roles si se proporcionaron
      if (dto.rolesIds && dto.rolesIds.length > 0) {
        const rolesValidos = await this.prisma.roles.findMany({
          where: {
            id_rol: { in: dto.rolesIds },
            activo: true,
          },
        });

        if (rolesValidos.length !== dto.rolesIds.length) {
          const rolesEncontrados = rolesValidos.map((r: { id_rol: number }) => r.id_rol);
          const rolesNoEncontrados = dto.rolesIds.filter(
            (id) => !rolesEncontrados.includes(id),
          );
          throw new BadRequestException(
            `Los siguientes roles no existen o están inactivos: ${rolesNoEncontrados.join(', ')}`,
          );
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // FASE 2: IDENTITY RESOLUTION (Buscar persona existente)
      // ─────────────────────────────────────────────────────────────────────────

      let idPersona: number | undefined;

      // 2.1 Si se proporcionó id_persona_existente, usarlo directamente
      if (dto.id_persona_existente) {
        const personaExistente = await this.prisma.personas.findUnique({
          where: { id_persona: dto.id_persona_existente },
          include: { usuarios: true },
        });

        if (!personaExistente) {
          throw new NotFoundException(
            `Persona con ID ${dto.id_persona_existente} no encontrada`,
          );
        }

        if (personaExistente.usuarios) {
          throw new ConflictException(
            `La persona ID ${dto.id_persona_existente} ya tiene un usuario asociado`,
          );
        }

        idPersona = dto.id_persona_existente;
        personaReutilizada = true;
        this.logger.log(`Identity Resolution: Reutilizando persona ID ${idPersona}`);
      }
      // 2.2 Buscar por número de identificación
      else {
        const personaPorCedula = await this.prisma.personas.findFirst({
          where: {
            numero_identificacion: dto.datosPersona.numero_identificacion,
            tipo_identificacion: dto.datosPersona.tipo_identificacion as any,
          },
          include: { usuarios: true },
        });

        if (personaPorCedula) {
          if (personaPorCedula.usuarios) {
            throw new ConflictException(
              `La persona con ${dto.datosPersona.tipo_identificacion} ${dto.datosPersona.numero_identificacion} ya tiene un usuario`,
            );
          }
          idPersona = personaPorCedula.id_persona;
          personaReutilizada = true;
          this.logger.log(
            `Identity Resolution: Encontrada persona por cédula ID ${idPersona}`,
          );
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // FASE 3: PREPARAR PASSWORD
      // ─────────────────────────────────────────────────────────────────────────

      let passwordHash: string;
      const debeCambiarPassword = dto.datosUsuario.debe_cambiar_password ?? true;

      if (dto.datosUsuario.password) {
        // Password proporcionado por el admin
        passwordHash = await bcrypt.hash(
          dto.datosUsuario.password,
          this.SALT_ROUNDS,
        );
        this.logger.log('Password proporcionado por administrador');
      } else {
        // Generar password temporal seguro
        passwordTemporal = this.generarPasswordTemporal();
        passwordHash = await bcrypt.hash(passwordTemporal, this.SALT_ROUNDS);
        this.logger.log('Password temporal generado automáticamente');
      }

      // ─────────────────────────────────────────────────────────────────────────
      // FASE 4: TRANSACCIÓN ATÓMICA
      // ─────────────────────────────────────────────────────────────────────────

      const resultado = await this.prisma.$transaction(async (tx) => {
        // 4.1 Crear o reutilizar PERSONA
        let persona: any;

        if (idPersona) {
          persona = await tx.personas.findUnique({
            where: { id_persona: idPersona },
          });
        } else {
          persona = await tx.personas.create({
            data: this.construirDatosPersona(dto.datosPersona),
          });
          this.logger.log(`Persona creada con ID: ${persona.id_persona}`);
        }

        // 4.2 Crear USUARIO
        const usuario = await tx.usuarios.create({
          data: {
            id_persona: persona.id_persona,
            username: usernameNormalizado,
            email: emailUsuario.toLowerCase(),
            password_hash: passwordHash,
            debe_cambiar_password: debeCambiarPassword,
            estado: (dto.datosUsuario.estado || 'ACTIVO') as estado_usuario_enum,
            fecha_activacion: new Date(),
            fecha_ultimo_cambio_password: new Date(),
          },
        });
        this.logger.log(`Usuario creado con ID: ${usuario.id_usuario}`);

        // 4.3 Crear EMPLEADO (si se proporcionaron datos)
        let empleado: { id_empleado: number } | null = null;
        if (dto.datosEmpleado) {
          empleado = await tx.empleados.create({
            data: {
              id_persona: persona.id_persona,
              cargo: dto.datosEmpleado.cargo as cargo_empleado_enum,
              descripcion_cargo: dto.datosEmpleado.descripcion_cargo,
              fecha_ingreso: new Date(dto.datosEmpleado.fecha_ingreso),
              tipo_contrato: (dto.datosEmpleado.tipo_contrato || 'INDEFINIDO') as tipo_contrato_empleado_enum,
              departamento: dto.datosEmpleado.departamento,
              jefe_inmediato: dto.datosEmpleado.jefe_inmediato,
              contacto_emergencia: dto.datosEmpleado.contacto_emergencia,
              telefono_emergencia: dto.datosEmpleado.telefono_emergencia,
              nivel_academico: dto.datosEmpleado.nivel_academico as nivel_academico_enum,
              titulo_obtenido: dto.datosEmpleado.titulo_obtenido,
              institucion_educativa: dto.datosEmpleado.institucion_educativa,
              es_tecnico: dto.datosEmpleado.es_tecnico || false,
              es_asesor: dto.datosEmpleado.es_asesor || false,
              puede_conducir: dto.datosEmpleado.puede_conducir || false,
              licencia_conduccion: dto.datosEmpleado.licencia_conduccion,
              fecha_vencimiento_licencia: dto.datosEmpleado.fecha_vencimiento_licencia
                ? new Date(dto.datosEmpleado.fecha_vencimiento_licencia)
                : null,
              observaciones: dto.datosEmpleado.observaciones,
              habilidades_especiales: dto.datosEmpleado.habilidades_especiales,
              empleado_activo: true,
              creado_por: 1, // Usuario sistema por defecto, se puede mejorar después
            },
          });
          this.logger.log(`Empleado creado con ID: ${empleado.id_empleado}`);
        }

        // 4.4 Asignar ROLES
        const rolesAsignados: any[] = [];
        if (dto.rolesIds && dto.rolesIds.length > 0) {
          for (const idRol of dto.rolesIds) {
            await tx.usuarios_roles.create({
              data: {
                id_usuario: usuario.id_usuario,
                id_rol: idRol,
              },
            });
            const rol = await tx.roles.findUnique({
              where: { id_rol: idRol },
            });
            if (rol) {
              rolesAsignados.push({
                id_rol: rol.id_rol,
                codigo_rol: rol.codigo_rol,
                nombre_rol: rol.nombre_rol,
              });
            }
          }
          this.logger.log(`Roles asignados: ${rolesAsignados.length}`);
        }

        return { persona, usuario, empleado, rolesAsignados };
      });

      // ─────────────────────────────────────────────────────────────────────────
      // FASE 5: CONSTRUIR RESPUESTA
      // ─────────────────────────────────────────────────────────────────────────

      const nombreCompleto = this.construirNombreCompleto(resultado.persona);

      const response: UsuarioCompletoResponse = {
        success: true,
        message: personaReutilizada
          ? 'Usuario creado exitosamente (persona existente reutilizada)'
          : 'Usuario creado exitosamente',
        data: {
          id_usuario: resultado.usuario.id_usuario,
          id_persona: resultado.persona.id_persona,
          id_empleado: resultado.empleado?.id_empleado,
          username: resultado.usuario.username,
          email: resultado.usuario.email,
          estado: resultado.usuario.estado || 'PENDIENTE_ACTIVACION',
          roles: resultado.rolesAsignados,
          persona: {
            nombre_completo: nombreCompleto,
            tipo_identificacion: resultado.persona.tipo_identificacion,
            numero_identificacion: resultado.persona.numero_identificacion,
          },
          persona_reutilizada: personaReutilizada,
        },
      };

      // Solo incluir password temporal si se generó
      if (passwordTemporal) {
        response.data.password_temporal = passwordTemporal;
      }

      this.logger.log('═══════════════════════════════════════════════════════════');
      this.logger.log('USUARIO CREADO EXITOSAMENTE');
      this.logger.log(`ID Usuario: ${response.data.id_usuario}`);
      this.logger.log(`Username: ${response.data.username}`);
      this.logger.log('═══════════════════════════════════════════════════════════');

      return response;
    } catch (error: unknown) {
      this.logger.error('Error en crearUsuarioCompleto:', error);

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Error de Prisma por constraint único
      const prismaError = error as { code?: string; meta?: { target?: string[] }; message?: string };
      if (prismaError.code === 'P2002') {
        const campo = prismaError.meta?.target?.[0] || 'campo';
        throw new ConflictException(
          `Ya existe un registro con el mismo valor de ${campo}`,
        );
      }

      throw new InternalServerErrorException(
        'Error interno al crear usuario: ' + (prismaError.message || 'Error desconocido'),
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MÉTODO: BUSCAR PERSONA EXISTENTE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Busca si existe una persona por cédula/email/nombre
   * Útil para el frontend antes de crear un usuario
   */
  async buscarPersonaExistente(
    dto: BuscarPersonaDto,
  ): Promise<PersonaExistenteResponse> {
    this.logger.log('Buscando persona existente...');

    let persona: any = null;

    // Buscar por número de identificación
    if (dto.numero_identificacion) {
      persona = await this.prisma.personas.findFirst({
        where: {
          numero_identificacion: dto.numero_identificacion,
        },
        include: {
          usuarios: {
            select: {
              id_usuario: true,
              username: true,
              email: true,
              estado: true,
            },
          },
          empleados: { select: { id_empleado: true } },
          clientes: { select: { id_cliente: true } },
          proveedores: { select: { id_proveedor: true } },
        },
      });
    }
    // Buscar por email
    else if (dto.email) {
      persona = await this.prisma.personas.findFirst({
        where: {
          email_principal: {
            equals: dto.email,
            mode: 'insensitive',
          },
        },
        include: {
          usuarios: {
            select: {
              id_usuario: true,
              username: true,
              email: true,
              estado: true,
            },
          },
          empleados: { select: { id_empleado: true } },
          clientes: { select: { id_cliente: true } },
          proveedores: { select: { id_proveedor: true } },
        },
      });
    }
    // Búsqueda libre por nombre
    else if (dto.query) {
      persona = await this.prisma.personas.findFirst({
        where: {
          OR: [
            { primer_nombre: { contains: dto.query, mode: 'insensitive' } },
            { primer_apellido: { contains: dto.query, mode: 'insensitive' } },
            { razon_social: { contains: dto.query, mode: 'insensitive' } },
          ],
        },
        include: {
          usuarios: {
            select: {
              id_usuario: true,
              username: true,
              email: true,
              estado: true,
            },
          },
          empleados: { select: { id_empleado: true } },
          clientes: { select: { id_cliente: true } },
          proveedores: { select: { id_proveedor: true } },
        },
      });
    }

    if (!persona) {
      return {
        existe: false,
        tiene_usuario: false,
        tiene_empleado: false,
        es_cliente: false,
        es_proveedor: false,
      };
    }

    return {
      existe: true,
      tiene_usuario: !!persona.usuarios,
      tiene_empleado: persona.empleados?.length > 0,
      es_cliente: persona.clientes?.length > 0,
      es_proveedor: persona.proveedores?.length > 0,
      persona: {
        id_persona: persona.id_persona,
        nombre_completo: this.construirNombreCompleto(persona),
        tipo_identificacion: persona.tipo_identificacion,
        numero_identificacion: persona.numero_identificacion,
        email_principal: persona.email_principal,
        tipo_persona: persona.tipo_persona,
      },
      usuario: persona.usuarios || undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MÉTODOS AUXILIARES PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Genera un password temporal seguro
   * Formato: 2 letras mayúsculas + 4 números + 2 símbolos
   */
  private generarPasswordTemporal(): string {
    const mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sin I, O para evitar confusión
    const numeros = '23456789'; // Sin 0, 1 para evitar confusión
    const simbolos = '@#$%&*';

    let password = '';

    // 2 mayúsculas
    for (let i = 0; i < 2; i++) {
      password += mayusculas[crypto.randomInt(mayusculas.length)];
    }
    // 4 números
    for (let i = 0; i < 4; i++) {
      password += numeros[crypto.randomInt(numeros.length)];
    }
    // 2 símbolos
    for (let i = 0; i < 2; i++) {
      password += simbolos[crypto.randomInt(simbolos.length)];
    }

    // Mezclar caracteres
    return password
      .split('')
      .sort(() => crypto.randomInt(3) - 1)
      .join('');
  }

  /**
   * Construye el objeto de datos para crear una persona
   */
  private construirDatosPersona(dto: DatosPersonaDto): any {
    return {
      tipo_identificacion: dto.tipo_identificacion as any,
      numero_identificacion: dto.numero_identificacion,
      tipo_persona: dto.tipo_persona as any,
      primer_nombre: dto.primer_nombre,
      segundo_nombre: dto.segundo_nombre,
      primer_apellido: dto.primer_apellido,
      segundo_apellido: dto.segundo_apellido,
      razon_social: dto.razon_social,
      nombre_comercial: dto.nombre_comercial,
      representante_legal: dto.representante_legal,
      cedula_representante: dto.cedula_representante,
      email_principal: dto.email_principal?.toLowerCase(),
      telefono_principal: dto.telefono_principal,
      telefono_secundario: dto.telefono_secundario,
      celular: dto.celular,
      direccion_principal: dto.direccion_principal,
      barrio_zona: dto.barrio_zona,
      ciudad: dto.ciudad || 'CARTAGENA',
      departamento: dto.departamento || 'BOLÍVAR',
      pais: dto.pais || 'COLOMBIA',
      fecha_nacimiento: dto.fecha_nacimiento
        ? new Date(dto.fecha_nacimiento)
        : null,
      observaciones: dto.observaciones,
    };
  }

  /**
   * Construye el nombre completo de una persona
   */
  private construirNombreCompleto(persona: any): string {
    if (persona.tipo_persona === 'JURIDICA') {
      return persona.razon_social || persona.nombre_comercial || 'Sin nombre';
    }

    const partes = [
      persona.primer_nombre,
      persona.segundo_nombre,
      persona.primer_apellido,
      persona.segundo_apellido,
    ].filter(Boolean);

    return partes.join(' ') || 'Sin nombre';
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MÉTODO: LISTAR USUARIOS CON INFORMACIÓN COMPLETA
  // ═══════════════════════════════════════════════════════════════════════════════

  async listarUsuariosCompletos(opciones?: {
    page?: number;
    limit?: number;
    estado?: string;
    busqueda?: string;
  }) {
    const page = opciones?.page || 1;
    const limit = opciones?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.usuariosWhereInput = {};

    if (opciones?.estado) {
      where.estado = opciones.estado as estado_usuario_enum;
    }

    if (opciones?.busqueda) {
      where.OR = [
        { username: { contains: opciones.busqueda, mode: 'insensitive' } },
        { email: { contains: opciones.busqueda, mode: 'insensitive' } },
        {
          persona: {
            OR: [
              { primer_nombre: { contains: opciones.busqueda, mode: 'insensitive' } },
              { primer_apellido: { contains: opciones.busqueda, mode: 'insensitive' } },
              { razon_social: { contains: opciones.busqueda, mode: 'insensitive' } },
              { numero_identificacion: { contains: opciones.busqueda } },
            ],
          },
        },
      ];
    }

    const [usuarios, total] = await Promise.all([
      this.prisma.usuarios.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
        include: {
          persona: {
            select: {
              id_persona: true,
              tipo_identificacion: true,
              numero_identificacion: true,
              tipo_persona: true,
              primer_nombre: true,
              segundo_nombre: true,
              primer_apellido: true,
              segundo_apellido: true,
              razon_social: true,
              email_principal: true,
              telefono_principal: true,
              celular: true,
            },
          },
          usuarios_roles_usuarios_roles_id_usuarioTousuarios: {
            include: {
              roles: {
                select: {
                  id_rol: true,
                  codigo_rol: true,
                  nombre_rol: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.usuarios.count({ where }),
    ]);

    return {
      data: usuarios.map((u) => ({
        id_usuario: u.id_usuario,
        username: u.username,
        email: u.email,
        estado: u.estado,
        ultima_sesion: u.ultima_sesion,
        fecha_creacion: u.fecha_creacion,
        persona: {
          id_persona: u.persona.id_persona,
          nombre_completo: this.construirNombreCompleto(u.persona),
          tipo_identificacion: u.persona.tipo_identificacion,
          numero_identificacion: u.persona.numero_identificacion,
          tipo_persona: u.persona.tipo_persona,
          email_principal: u.persona.email_principal,
          telefono: u.persona.telefono_principal || u.persona.celular,
        },
        roles: u.usuarios_roles_usuarios_roles_id_usuarioTousuarios.map((ur) => ({
          id_rol: ur.roles.id_rol,
          codigo_rol: ur.roles.codigo_rol,
          nombre_rol: ur.roles.nombre_rol,
        })),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
