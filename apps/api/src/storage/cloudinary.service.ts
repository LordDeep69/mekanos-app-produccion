/**
 * ============================================================================
 * CLOUDINARY SERVICE - MEKANOS S.A.S
 * ============================================================================
 * Servicio para gestión de imágenes y evidencias fotográficas con Cloudinary.
 *
 * Cuentas configuradas:
 * - PLANTAS: Para generadores y plantas eléctricas
 * - BOMBAS: Para bombas y sistemas de bombeo
 * ============================================================================
 */

import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import { ConfiguracionOrganizacionService } from '../configuracion-organizacion/configuracion-organizacion.service';

const CLOUDINARY_UPLOAD_TIMEOUT_MS = 300_000; // 5 minutos por upload (conexión lenta)
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 5_000; // 5s inicial, luego 10s, 20s

export type CloudinaryAccount = 'PRIMARY' | 'PLANTAS' | 'BOMBAS';

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

export interface EvidenciaUpload {
  buffer: Buffer;
  filename: string;
  ordenId: string;
  tipo: 'ANTES' | 'DURANTE' | 'DESPUES';
  descripcion?: string;
}

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private configuredAccounts: Set<CloudinaryAccount> = new Set();

  constructor(
    @Optional() private readonly configOrgService?: ConfiguracionOrganizacionService,
  ) {}

  private async resolveDefaultFolder(): Promise<string> {
    const ctx = await this.configOrgService?.getContext().catch(() => null);
    const prefix = (ctx?.storage_prefijo_raiz || 'eam-media').replace(/^\/+|\/+$/g, '');
    return `${prefix}/evidencias`;
  }

  private getCredentials(account: CloudinaryAccount) {
    if (account === 'PRIMARY') {
      return {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      };
    }
    return {
      cloud_name: process.env[`CLOUDINARY_CLOUD_NAME_${account}`],
      api_key: process.env[`CLOUDINARY_API_KEY_${account}`],
      api_secret: process.env[`CLOUDINARY_API_SECRET_${account}`],
    };
  }

  private getDefaultAccount(): CloudinaryAccount {
    if (this.configuredAccounts.has('PRIMARY')) return 'PRIMARY';
    if (this.configuredAccounts.has('PLANTAS')) return 'PLANTAS';
    if (this.configuredAccounts.has('BOMBAS')) return 'BOMBAS';
    return 'PRIMARY';
  }

  async onModuleInit() {
    for (const acc of ['PRIMARY', 'PLANTAS', 'BOMBAS'] as CloudinaryAccount[]) {
      if (this.isAccountConfigured(acc)) {
        this.configuredAccounts.add(acc);
        this.logger.log(`✅ Cloudinary ${acc} configurado`);
      }
    }

    if (this.configuredAccounts.size === 0) {
      this.logger.warn('⚠️ Ninguna cuenta Cloudinary configurada');
    }
  }

  private configureAccount(account: CloudinaryAccount): void {
    const creds = this.getCredentials(account);
    cloudinary.config({
      cloud_name: creds.cloud_name,
      api_key: creds.api_key,
      api_secret: creds.api_secret,
      secure: true,
    });
  }

  private isAccountConfigured(account: CloudinaryAccount): boolean {
    const creds = this.getCredentials(account);
    return !!(creds.cloud_name && creds.api_key && creds.api_secret);
  }

  /**
   * Sube una imagen desde un buffer con retry y fallback local
   */
  async uploadImage(
    buffer: Buffer,
    options: {
      folder?: string;
      publicId?: string;
      account?: CloudinaryAccount;
      tags?: string[];
    } = {},
  ): Promise<UploadResult> {
    const account = options.account && this.configuredAccounts.has(options.account)
      ? options.account
      : this.getDefaultAccount();

    if (!this.configuredAccounts.has(account)) {
      return {
        success: false,
        error: `Cuenta Cloudinary ${account} no configurada`,
      };
    }

    const folderResolved = options.folder || (await this.resolveDefaultFolder());
    const uploadOpts = { ...options, folder: folderResolved };

    this.configureAccount(account);

    // Intentar Cloudinary con retry
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this._uploadToCloudinary(buffer, uploadOpts);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`⚠️ Cloudinary intento ${attempt}/${MAX_RETRIES} falló: ${message}`);
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    // Fallback local: guardar imagen en disco
    this.logger.warn('⚠️ Cloudinary no disponible tras reintentos - guardando localmente');
    return this._saveLocally(buffer, uploadOpts);
  }

  /**
   * Sube a Cloudinary (un intento)
   */
  private _uploadToCloudinary(
    buffer: Buffer,
    options: { folder?: string; publicId?: string; tags?: string[] } = {},
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder: options.folder || 'eam-media/evidencias',
        resource_type: 'image',
        tags: options.tags || [],
        timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS,
      };

      if (options.publicId) {
        uploadOptions.public_id = options.publicId;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              success: true,
              url: result.secure_url,
              publicId: result.public_id,
            });
          } else {
            reject(new Error('Unknown Cloudinary error'));
          }
        },
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Guarda la imagen localmente como fallback cuando Cloudinary no está disponible
   */
  private async _saveLocally(
    buffer: Buffer,
    options: { folder?: string; publicId?: string } = {},
  ): Promise<UploadResult> {
    try {
      const pendingDir = path.join(process.cwd(), 'uploads', 'pending');
      fs.mkdirSync(pendingDir, { recursive: true });

      const timestamp = Date.now();
      const filename = options.publicId
        ? `${options.publicId}_${timestamp}.jpg`
        : `pending_${timestamp}.jpg`;
      const filePath = path.join(pendingDir, filename);
      fs.writeFileSync(filePath, buffer);

      this.logger.log(`✅ Imagen guardada localmente: ${filePath}`);

      return {
        success: true,
        url: `/uploads/pending/${filename}`,
        publicId: `local_${timestamp}`,
      };
    } catch (fsError) {
      const message = fsError instanceof Error ? fsError.message : 'File system error';
      this.logger.error(`❌ Error guardando imagen local: ${message}`);
      return { success: false, error: `Error de almacenamiento: ${message}` };
    }
  }

  /**
   * Sube una imagen desde URL
   */
  async uploadFromUrl(
    url: string,
    options: {
      folder?: string;
      publicId?: string;
      account?: CloudinaryAccount;
      tags?: string[];
    } = {},
  ): Promise<UploadResult> {
    const account = options.account && this.configuredAccounts.has(options.account)
      ? options.account
      : this.getDefaultAccount();

    if (!this.configuredAccounts.has(account)) {
      return {
        success: false,
        error: `Cuenta Cloudinary ${account} no configurada`,
      };
    }

    this.configureAccount(account);

    try {
      const folderResolved = options.folder || (await this.resolveDefaultFolder());
      const result = await cloudinary.uploader.upload(url, {
        folder: folderResolved,
        public_id: options.publicId,
        tags: options.tags || [],
      });

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error uploading from URL: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sube evidencias fotográficas de una orden de servicio
   */
  async uploadEvidencia(evidencia: EvidenciaUpload, _tipoEquipo?: string): Promise<UploadResult> {
    const account = this.getDefaultAccount();
    const baseFolder = (await this.resolveDefaultFolder()).replace(/\/evidencias$/i, '');
    const folder = `${baseFolder}/ordenes/${evidencia.ordenId}/evidencias`;
    const publicId = `${evidencia.tipo.toLowerCase()}_${Date.now()}`;
    const tags = ['evidencia', evidencia.tipo, evidencia.ordenId];

    return this.uploadImage(evidencia.buffer, {
      folder,
      publicId,
      account,
      tags,
    });
  }

  /**
   * Sube múltiples evidencias
   */
  async uploadMultipleEvidencias(
    evidencias: EvidenciaUpload[],
    tipoEquipo?: string,
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const evidencia of evidencias) {
      const result = await this.uploadEvidencia(evidencia, tipoEquipo);
      results.push(result);
    }

    return results;
  }

  /**
   * Genera URL optimizada para diferentes tamaños
   */
  getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
    } = {},
  ): string {
    return cloudinary.url(publicId, {
      transformation: [
        {
          width: options.width || 800,
          height: options.height,
          crop: 'limit',
          quality: options.quality || 'auto',
          format: options.format || 'auto',
        },
      ],
    });
  }

  /**
   * Genera URL para thumbnail
   */
  getThumbnailUrl(publicId: string, size: number = 150): string {
    return cloudinary.url(publicId, {
      transformation: [
        {
          width: size,
          height: size,
          crop: 'fill',
          quality: 'auto:low',
          format: 'webp',
        },
      ],
    });
  }

  /**
   * Elimina una imagen
   */
  async deleteImage(publicId: string, account: CloudinaryAccount = 'PLANTAS'): Promise<boolean> {
    if (!this.configuredAccounts.has(account)) {
      return false;
    }

    this.configureAccount(account);

    try {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting image: ${error}`);
      return false;
    }
  }

  /**
   * Verifica estado del servicio
   */
  getStatus(): { configured: boolean; accounts: CloudinaryAccount[] } {
    return {
      configured: this.configuredAccounts.size > 0,
      accounts: Array.from(this.configuredAccounts),
    };
  }
}
