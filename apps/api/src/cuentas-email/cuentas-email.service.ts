import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../database/prisma.service';
import { CreateCuentaEmailDto, UpdateCuentaEmailDto } from './dto';

@Injectable()
export class CuentasEmailService {
  private readonly logger = new Logger(CuentasEmailService.name);

  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateCuentaEmailDto, userId: number) {
    this.logger.log(`Creando cuenta de email: ${dto.email}`);

    // Si es principal, desmarcar otras cuentas principales
    if (dto.es_cuenta_principal) {
      await this.prisma.cuentas_email.updateMany({
        where: { es_cuenta_principal: true },
        data: { es_cuenta_principal: false },
      });
    }

    // Verificar que las credenciales son válidas
    const isValid = await this.verificarCredenciales(
      dto.gmail_client_id,
      dto.gmail_client_secret,
      dto.gmail_refresh_token,
    );

    if (!isValid) {
      throw new BadRequestException('Las credenciales de Gmail API no son válidas. Verifica Client ID, Client Secret y Refresh Token.');
    }

    const cuenta = await this.prisma.cuentas_email.create({
      data: {
        nombre: dto.nombre,
        email: dto.email,
        gmail_client_id: dto.gmail_client_id,
        gmail_client_secret: dto.gmail_client_secret,
        gmail_refresh_token: dto.gmail_refresh_token,
        es_cuenta_principal: dto.es_cuenta_principal ?? false,
        activa: dto.activa ?? true,
        creado_por: userId,
      },
    });

    this.logger.log(`✅ Cuenta de email creada: ${cuenta.email} (ID: ${cuenta.id_cuenta_email})`);

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

    return cuentas.map(this.sanitizeCuenta);
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
      // Buscar cualquier cuenta activa como fallback
      const fallback = await this.prisma.cuentas_email.findFirst({
        where: { activa: true },
        orderBy: { fecha_creacion: 'asc' },
      });
      return fallback;
    }

    return cuenta;
  }

  async findByIdForEmail(id: number) {
    // Este método devuelve las credenciales completas para uso interno del EmailService
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

    // Si se están actualizando credenciales, verificarlas
    if (dto.gmail_client_id || dto.gmail_client_secret || dto.gmail_refresh_token) {
      const clientId = dto.gmail_client_id ?? existing.gmail_client_id;
      const clientSecret = dto.gmail_client_secret ?? existing.gmail_client_secret;
      const refreshToken = dto.gmail_refresh_token ?? existing.gmail_refresh_token;

      const isValid = await this.verificarCredenciales(clientId, clientSecret, refreshToken);

      if (!isValid) {
        throw new BadRequestException('Las credenciales de Gmail API no son válidas.');
      }
    }

    // Si se marca como principal, desmarcar otras
    if (dto.es_cuenta_principal) {
      await this.prisma.cuentas_email.updateMany({
        where: { es_cuenta_principal: true, NOT: { id_cuenta_email: id } },
        data: { es_cuenta_principal: false },
      });
    }

    const cuenta = await this.prisma.cuentas_email.update({
      where: { id_cuenta_email: id },
      data: {
        ...dto,
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

    // Verificar si hay clientes usando esta cuenta
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

  async verificarCredenciales(clientId: string, clientSecret: string, refreshToken: string): Promise<boolean> {
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
      this.logger.error(`❌ Error verificando credenciales: ${error.message}`);
      return false;
    }
  }

  async testEnvio(id: number): Promise<{ success: boolean; message: string }> {
    const cuenta = await this.findByIdForEmail(id);

    try {
      const OAuth2 = google.auth.OAuth2;
      const oauth2Client = new OAuth2(
        cuenta.gmail_client_id,
        cuenta.gmail_client_secret,
        'https://developers.google.com/oauthplayground',
      );
      oauth2Client.setCredentials({ refresh_token: cuenta.gmail_refresh_token });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Verificar perfil
      const profile = await gmail.users.getProfile({ userId: 'me' });

      return {
        success: true,
        message: `Conexión exitosa. Email verificado: ${profile.data.emailAddress}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error de conexión: ${error.message}`,
      };
    }
  }

  // Método para obtener cuentas para selector (sin credenciales sensibles)
  async findAllForSelector() {
    const cuentas = await this.prisma.cuentas_email.findMany({
      where: { activa: true },
      select: {
        id_cuenta_email: true,
        nombre: true,
        email: true,
        es_cuenta_principal: true,
      },
      orderBy: [{ es_cuenta_principal: 'desc' }, { nombre: 'asc' }],
    });

    // Mapear es_cuenta_principal a es_principal para el frontend
    return cuentas.map(c => ({
      id_cuenta_email: c.id_cuenta_email,
      nombre: c.nombre,
      email: c.email,
      es_principal: c.es_cuenta_principal,
    }));
  }

  // Sanitizar cuenta para no exponer credenciales en respuestas
  private sanitizeCuenta(cuenta: any) {
    const { gmail_client_id, gmail_client_secret, gmail_refresh_token, es_cuenta_principal, ...safe } = cuenta;
    return {
      ...safe,
      es_principal: es_cuenta_principal, // Mapear al nombre esperado por el frontend
      credenciales_configuradas: !!(gmail_client_id && gmail_client_secret && gmail_refresh_token),
    };
  }
}
