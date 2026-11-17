import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';
import { decryptSecret, encryptSecret } from '../common/utils/crypto-secrets.util';
import { PrismaService } from '../database/prisma.service';
import { CreateCuentaEmailDto, UpdateCuentaEmailDto } from './dto';

@Injectable()
export class CuentasEmailService {
  private readonly logger = new Logger(CuentasEmailService.name);

  constructor(private readonly prisma: PrismaService) {}

  private resolveProvider(dto: Partial<CreateCuentaEmailDto>): 'GMAIL_OAUTH2' | 'SMTP' {
    if (dto.tipo_proveedor === 'SMTP') return 'SMTP';
    if (dto.tipo_proveedor === 'GMAIL_OAUTH2') return 'GMAIL_OAUTH2';
    if (dto.smtp_host && !dto.gmail_client_id) return 'SMTP';
    return 'GMAIL_OAUTH2';
  }

  async create(dto: CreateCuentaEmailDto, userId: number) {
    this.logger.log(`Creando cuenta de email: ${dto.email}`);
    const provider = this.resolveProvider(dto);

    let smtpPasswordEnc: string | null = null;

    if (provider === 'SMTP') {
      if (!dto.smtp_host || !dto.smtp_user || !dto.smtp_password) {
        throw new BadRequestException(
          'Para cuentas SMTP se requieren smtp_host, smtp_user y smtp_password.',
        );
      }
      const smtpPort = dto.smtp_port ?? 465;
      const smtpSecure = dto.smtp_secure ?? smtpPort === 465;
      const isValidSmtp = await this.verificarCredencialesSmtp({
        host: dto.smtp_host,
        port: smtpPort,
        secure: smtpSecure,
        user: dto.smtp_user,
        pass: dto.smtp_password,
      });
      if (!isValidSmtp) {
        throw new BadRequestException(
          'Las credenciales SMTP no son válidas o el servidor rechazó la verificación.',
        );
      }
      smtpPasswordEnc = encryptSecret(dto.smtp_password);
    } else {
      if (!dto.gmail_client_id || !dto.gmail_client_secret || !dto.gmail_refresh_token) {
        throw new BadRequestException(
          'Para cuentas GMAIL_OAUTH2 se requieren gmail_client_id, gmail_client_secret y gmail_refresh_token.',
        );
      }
      const isValid = await this.verificarCredenciales(
        dto.gmail_client_id,
        dto.gmail_client_secret,
        dto.gmail_refresh_token,
      );
      if (!isValid) {
        throw new BadRequestException(
          'Las credenciales de Gmail API no son válidas. Verifica Client ID, Client Secret y Refresh Token.',
        );
      }
    }

    if (dto.es_cuenta_principal) {
      await this.prisma.cuentas_email.updateMany({
        where: { es_cuenta_principal: true },
        data: { es_cuenta_principal: false },
      });
    }

    const cuenta = await this.prisma.cuentas_email.create({
      data: {
        nombre: dto.nombre,
        email: dto.email,
        tipo_proveedor: provider,
        nombre_remitente: dto.nombre_remitente ?? dto.nombre,
        descripcion: dto.descripcion,
        gmail_client_id: provider === 'GMAIL_OAUTH2' ? dto.gmail_client_id : null,
        gmail_client_secret: provider === 'GMAIL_OAUTH2' ? dto.gmail_client_secret : null,
        gmail_refresh_token: provider === 'GMAIL_OAUTH2' ? dto.gmail_refresh_token : null,
        smtp_host: provider === 'SMTP' ? dto.smtp_host : null,
        smtp_port: provider === 'SMTP' ? (dto.smtp_port ?? 465) : null,
        smtp_secure: provider === 'SMTP' ? (dto.smtp_secure ?? (dto.smtp_port ?? 465) === 465) : true,
        smtp_user: provider === 'SMTP' ? dto.smtp_user : null,
        smtp_password_enc: smtpPasswordEnc,
        es_cuenta_principal: dto.es_cuenta_principal ?? false,
        activa: dto.activa ?? true,
        creado_por: userId,
      },
    });

    this.logger.log(
      `✅ Cuenta de email creada (${provider}): ${cuenta.email} (ID: ${cuenta.id_cuenta_email})`,
    );

    return this.sanitizeCuenta(cuenta);
  }

  async findAll() {
    const cuentas = await this.prisma.cuentas_email.findMany({
      orderBy: [{ es_cuenta_principal: 'desc' }, { nombre: 'asc' }],
      include: {
        usuarios_cuentas_email_creado_porTousuarios: {
          select: {
            id_usuario: true,
            username: true,
          },
        },
      },
    });

    return cuentas.map((c) => this.sanitizeCuenta(c));
  }

  async findOne(id: number) {
    const cuenta = await this.prisma.cuentas_email.findUnique({
      where: { id_cuenta_email: id },
      include: {
        usuarios_cuentas_email_creado_porTousuarios: {
          select: {
            id_usuario: true,
            username: true,
          },
        },
      },
    });

    if (!cuenta) {
      throw new NotFoundException(`Cuenta de email con ID ${id} no encontrada`);
    }

    return this.sanitizeCuenta(cuenta);
  }

  async findPrincipal() {
    const cuenta = await this.prisma.cuentas_email.findFirst({
      where: { es_cuenta_principal: true, activa: true },
    });

    if (!cuenta) {
      const fallback = await this.prisma.cuentas_email.findFirst({
        where: { activa: true },
        orderBy: { fecha_creacion: 'asc' },
      });
      return fallback ? this.sanitizeCuenta(fallback) : null;
    }

    return this.sanitizeCuenta(cuenta);
  }

  async findByIdForEmail(id: number) {
    const cuenta = await this.prisma.cuentas_email.findUnique({
      where: { id_cuenta_email: id, activa: true },
    });

    if (!cuenta) {
      throw new NotFoundException(`Cuenta de email con ID ${id} no encontrada o inactiva`);
    }

    return cuenta;
  }

  async update(id: number, dto: UpdateCuentaEmailDto, userId: number) {
    const existing = await this.prisma.cuentas_email.findUnique({
      where: { id_cuenta_email: id },
    });

    if (!existing) {
      throw new NotFoundException(`Cuenta de email con ID ${id} no encontrada`);
    }

    const targetProvider =
      dto.tipo_proveedor ?? (existing.tipo_proveedor === 'SMTP' ? 'SMTP' : 'GMAIL_OAUTH2');

    const { smtp_password, ...restDto } = dto;
    let smtpPasswordEncUpdate: string | undefined;

    if (targetProvider === 'SMTP') {
      const smtpCredentialsTouched =
        Boolean(dto.smtp_host) ||
        dto.smtp_port !== undefined ||
        dto.smtp_secure !== undefined ||
        Boolean(dto.smtp_user) ||
        Boolean(smtp_password) ||
        dto.tipo_proveedor === 'SMTP';

      if (smtpCredentialsTouched) {
        const host = dto.smtp_host ?? existing.smtp_host;
        const port = dto.smtp_port ?? existing.smtp_port ?? 465;
        const secure = dto.smtp_secure ?? existing.smtp_secure ?? port === 465;
        const user = dto.smtp_user ?? existing.smtp_user;
        const pass =
          smtp_password ??
          (existing.smtp_password_enc ? decryptSecret(existing.smtp_password_enc) : '');

        if (!host || !user || !pass) {
          throw new BadRequestException(
            'Credenciales SMTP incompletas. Proporciona smtp_host, smtp_user y smtp_password.',
          );
        }

        const isValidSmtp = await this.verificarCredencialesSmtp({
          host,
          port,
          secure,
          user,
          pass,
        });
        if (!isValidSmtp) {
          throw new BadRequestException('Las credenciales SMTP no son válidas.');
        }

        if (smtp_password) {
          smtpPasswordEncUpdate = encryptSecret(smtp_password);
        }
      }
    } else if (dto.gmail_client_id || dto.gmail_client_secret || dto.gmail_refresh_token) {
      const clientId = dto.gmail_client_id ?? existing.gmail_client_id;
      const clientSecret = dto.gmail_client_secret ?? existing.gmail_client_secret;
      const refreshToken = dto.gmail_refresh_token ?? existing.gmail_refresh_token;

      if (!clientId || !clientSecret || !refreshToken) {
        throw new BadRequestException('Credenciales de Gmail API incompletas.');
      }

      const isValid = await this.verificarCredenciales(clientId, clientSecret, refreshToken);
      if (!isValid) {
        throw new BadRequestException('Las credenciales de Gmail API no son válidas.');
      }
    }

    if (dto.es_cuenta_principal) {
      await this.prisma.cuentas_email.updateMany({
        where: { es_cuenta_principal: true, NOT: { id_cuenta_email: id } },
        data: { es_cuenta_principal: false },
      });
    }

    const cuenta = await this.prisma.cuentas_email.update({
      where: { id_cuenta_email: id },
      data: {
        ...restDto,
        ...(smtpPasswordEncUpdate ? { smtp_password_enc: smtpPasswordEncUpdate } : {}),
        modificado_por: userId,
        fecha_modificacion: new Date(),
      },
    });

    this.logger.log(`✅ Cuenta de email actualizada: ${cuenta.email}`);

    return this.sanitizeCuenta(cuenta);
  }

  async remove(id: number) {
    const cuenta = await this.prisma.cuentas_email.findUnique({
      where: { id_cuenta_email: id },
    });

    if (!cuenta) {
      throw new NotFoundException(`Cuenta de email con ID ${id} no encontrada`);
    }

    const clientesUsando = await this.prisma.clientes.count({
      where: { id_cuenta_email_remitente: id },
    });

    if (clientesUsando > 0) {
      throw new BadRequestException(
        `No se puede eliminar la cuenta. Hay ${clientesUsando} cliente(s) usando esta cuenta de email.`,
      );
    }

    await this.prisma.cuentas_email.delete({
      where: { id_cuenta_email: id },
    });

    this.logger.log(`🗑️ Cuenta de email eliminada: ${cuenta.email}`);

    return { message: `Cuenta de email ${cuenta.email} eliminada correctamente` };
  }

  async verificarCredenciales(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<boolean> {
    try {
      const OAuth2 = google.auth.OAuth2;
      const oauth2Client = new OAuth2(
        clientId,
        clientSecret,
        'https://developers.google.com/oauthplayground',
      );
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      const { token } = await oauth2Client.getAccessToken();
      return !!token;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error verificando credenciales Gmail API: ${msg}`);
      return false;
    }
  }

  async verificarCredencialesSmtp(params: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  }): Promise<boolean> {
    let transporter: nodemailer.Transporter | null = null;
    try {
      transporter = nodemailer.createTransport({
        host: params.host,
        port: params.port,
        secure: params.secure,
        auth: { user: params.user, pass: params.pass },
        connectionTimeout: 10000,
      });
      await transporter.verify();
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error verificando credenciales SMTP: ${msg}`);
      return false;
    } finally {
      transporter?.close();
    }
  }

  async testEnvio(id: number): Promise<{ success: boolean; message: string }> {
    const cuenta = await this.findByIdForEmail(id);

    if (cuenta.tipo_proveedor === 'SMTP') {
      if (!cuenta.smtp_host || !cuenta.smtp_user || !cuenta.smtp_password_enc) {
        return {
          success: false,
          message: 'Error de conexión: Credenciales SMTP incompletas en la cuenta.',
        };
      }
      try {
        const pass = decryptSecret(cuenta.smtp_password_enc);
        const ok = await this.verificarCredencialesSmtp({
          host: cuenta.smtp_host,
          port: cuenta.smtp_port ?? 465,
          secure: cuenta.smtp_secure ?? true,
          user: cuenta.smtp_user,
          pass,
        });
        return ok
          ? {
              success: true,
              message: `Conexión SMTP exitosa: ${cuenta.smtp_host}:${cuenta.smtp_port ?? 465} (${cuenta.email})`,
            }
          : {
              success: false,
              message: 'Error de conexión SMTP: El servidor rechazó la autenticación.',
            };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { success: false, message: `Error de conexión SMTP: ${msg}` };
      }
    }

    if (!cuenta.gmail_client_id || !cuenta.gmail_client_secret || !cuenta.gmail_refresh_token) {
      return {
        success: false,
        message: 'Error de conexión: Credenciales Gmail OAuth2 incompletas.',
      };
    }

    try {
      const OAuth2 = google.auth.OAuth2;
      const oauth2Client = new OAuth2(
        cuenta.gmail_client_id,
        cuenta.gmail_client_secret,
        'https://developers.google.com/oauthplayground',
      );
      oauth2Client.setCredentials({ refresh_token: cuenta.gmail_refresh_token });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      return {
        success: true,
        message: `Conexión exitosa. Email verificado: ${profile.data.emailAddress}`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Error de conexión: ${msg}`,
      };
    }
  }

  async findAllForSelector() {
    const cuentas = await this.prisma.cuentas_email.findMany({
      where: { activa: true },
      select: {
        id_cuenta_email: true,
        nombre: true,
        email: true,
        tipo_proveedor: true,
        es_cuenta_principal: true,
      },
      orderBy: [{ es_cuenta_principal: 'desc' }, { nombre: 'asc' }],
    });

    return cuentas.map((c) => ({
      id_cuenta_email: c.id_cuenta_email,
      nombre: c.nombre,
      email: c.email,
      tipo_proveedor: c.tipo_proveedor,
      es_principal: c.es_cuenta_principal,
    }));
  }

  private sanitizeCuenta(cuenta: any) {
    const {
      gmail_client_id,
      gmail_client_secret,
      gmail_refresh_token,
      smtp_password_enc,
      es_cuenta_principal,
      ...safe
    } = cuenta;
    const provider = cuenta.tipo_proveedor === 'SMTP' ? 'SMTP' : 'GMAIL_OAUTH2';
    const credenciales_configuradas =
      provider === 'SMTP'
        ? !!(cuenta.smtp_host && cuenta.smtp_user && smtp_password_enc)
        : !!(gmail_client_id && gmail_client_secret && gmail_refresh_token);

    return {
      ...safe,
      es_principal: es_cuenta_principal,
      smtp_password_configurada: !!smtp_password_enc,
      credenciales_configuradas,
    };
  }
}
