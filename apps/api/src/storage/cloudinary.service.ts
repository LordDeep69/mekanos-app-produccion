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

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

export type CloudinaryAccount = 'PLANTAS' | 'BOMBAS';

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

  async onModuleInit() {
    // Verificar configuraciones disponibles
    if (this.isAccountConfigured('PLANTAS')) {
      this.configuredAccounts.add('PLANTAS');
      this.logger.log('✅ Cloudinary PLANTAS configurado');
    }
    if (this.isAccountConfigured('BOMBAS')) {
      this.configuredAccounts.add('BOMBAS');
      this.logger.log('✅ Cloudinary BOMBAS configurado');
    }

    if (this.configuredAccounts.size === 0) {
      this.logger.warn('⚠️ Ninguna cuenta Cloudinary configurada');
    }
  }

  /**
   * Configura Cloudinary para una cuenta específica
   */
  private configureAccount(account: CloudinaryAccount): void {
    const suffix = account;
    cloudinary.config({
      cloud_name: process.env[`CLOUDINARY_CLOUD_NAME_${suffix}`],
      api_key: process.env[`CLOUDINARY_API_KEY_${suffix}`],
      api_secret: process.env[`CLOUDINARY_API_SECRET_${suffix}`],
      secure: true,
    });
  }

  /**
   * Verifica si una cuenta está configurada
   */
  private isAccountConfigured(account: CloudinaryAccount): boolean {
    const suffix = account;
    return !!(
      process.env[`CLOUDINARY_CLOUD_NAME_${suffix}`] &&
      process.env[`CLOUDINARY_API_KEY_${suffix}`] &&
      process.env[`CLOUDINARY_API_SECRET_${suffix}`]
    );
  }

  /**
   * Determina la cuenta a usar basado en el tipo de equipo
   */
  private determineAccount(tipoEquipo?: string): CloudinaryAccount {
    if (tipoEquipo?.toUpperCase().includes('BOMBA')) {
      return 'BOMBAS';
    }
    return 'PLANTAS';
  }

  /**
   * Sube una imagen desde un buffer
   */
  async uploadImage(
    buffer: Buffer,
    options: {
      folder?: string;
      publicId?: string;
      account?: CloudinaryAccount;
      tags?: string[];
    } = {}
  ): Promise<UploadResult> {
    const account = options.account || 'PLANTAS';

    if (!this.configuredAccounts.has(account)) {
      return {
        success: false,
        error: `Cuenta Cloudinary ${account} no configurada`,
      };
    }

    this.configureAccount(account);

    return new Promise((resolve) => {
      const uploadOptions: any = {
        folder: options.folder || 'mekanos/evidencias',
        resource_type: 'image',
        tags: options.tags || [],
      };

      if (options.publicId) {
        uploadOptions.public_id = options.publicId;
      }

      // Usar upload_stream para buffers
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Error uploading to Cloudinary: ${error.message}`);
            resolve({
              success: false,
              error: error.message,
            });
          } else if (result) {
            resolve({
              success: true,
              url: result.secure_url,
              publicId: result.public_id,
            });
          } else {
            resolve({
              success: false,
              error: 'Unknown error',
            });
          }
        }
      );

      uploadStream.end(buffer);
    });
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
    } = {}
  ): Promise<UploadResult> {
    const account = options.account || 'PLANTAS';

    if (!this.configuredAccounts.has(account)) {
      return {
        success: false,
        error: `Cuenta Cloudinary ${account} no configurada`,
      };
    }

    this.configureAccount(account);

    try {
      const result = await cloudinary.uploader.upload(url, {
        folder: options.folder || 'mekanos/evidencias',
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
  async uploadEvidencia(evidencia: EvidenciaUpload, tipoEquipo?: string): Promise<UploadResult> {
    const account = this.determineAccount(tipoEquipo);
    const folder = `mekanos/ordenes/${evidencia.ordenId}/evidencias`;
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
    tipoEquipo?: string
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
  getOptimizedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  } = {}): string {
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
