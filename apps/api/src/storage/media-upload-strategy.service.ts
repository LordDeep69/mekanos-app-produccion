import { Injectable, Logger } from '@nestjs/common';
import { CloudinaryAccount, CloudinaryService } from './cloudinary.service';
import { R2Account, R2StorageService } from './r2-storage.service';

export type MediaStorageProvider = 'CLOUDINARY' | 'R2';

export interface PrepareMediaUploadInput {
  numeroOrden: string;
  hashSha256: string;
  mimeType?: string;
  tipoEvidencia?: string;
  cloudinaryAccount?: CloudinaryAccount;
  r2Account?: R2Account;
}

export interface PreparedDirectUploadInstruction {
  alreadyUploaded: boolean;
  provider: MediaStorageProvider;
  strategy: 'CLOUDINARY_MULTIPART' | 'R2_PUT' | 'ALREADY_UPLOADED';
  uploadUrl?: string;
  storageKey: string;
  publicUrl?: string;
  expiresAt?: string;
  fields?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface IMediaUploadStrategy {
  getActiveProvider(): MediaStorageProvider;
  prepareDirectUpload(input: PrepareMediaUploadInput): Promise<PreparedDirectUploadInstruction>;
}

/**
 * Estrategia agnóstica de subida directa de media de campo (Carril 2 - Fase 1).
 *
 * - Por defecto usa `CLOUDINARY` (`MEDIA_STORAGE_PROVIDER=CLOUDINARY`) con firma
 *   criptográfica Just-In-Time (`api_sign_request`) + `public_id = sha256_<hash>`.
 * - Conmutable a `R2` (`MEDIA_STORAGE_PROVIDER=R2`) mediante 1 variable de entorno
 *   sin modificar ni recompilar la app móvil.
 */
@Injectable()
export class MediaUploadStrategyService implements IMediaUploadStrategy {
  private readonly logger = new Logger(MediaUploadStrategyService.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly r2StorageService: R2StorageService,
  ) {}

  getActiveProvider(): MediaStorageProvider {
    const raw = (process.env.MEDIA_STORAGE_PROVIDER || 'CLOUDINARY').trim().toUpperCase();
    return raw === 'R2' ? 'R2' : 'CLOUDINARY';
  }

  async prepareDirectUpload(
    input: PrepareMediaUploadInput,
  ): Promise<PreparedDirectUploadInstruction> {
    const provider = this.getActiveProvider();

    if (provider === 'R2') {
      const r2 = await this.r2StorageService.createPresignedDirectUpload({
        numeroOrden: input.numeroOrden,
        hashSha256: input.hashSha256,
        mimeType: input.mimeType,
        account: input.r2Account,
      });

      if (r2.alreadyExistsInStorage) {
        this.logger.debug(
          `♻️ [MEDIA-STRATEGY] R2 HeadObject hit para ${input.hashSha256.slice(0, 12)} -> 0 bytes`,
        );
        return {
          alreadyUploaded: true,
          provider: 'R2',
          strategy: 'ALREADY_UPLOADED',
          storageKey: r2.storageKey,
          publicUrl: r2.publicUrl,
        };
      }

      return {
        alreadyUploaded: false,
        provider: 'R2',
        strategy: 'R2_PUT',
        uploadUrl: r2.uploadUrl,
        storageKey: r2.storageKey,
        publicUrl: r2.publicUrl,
        expiresAt: r2.expiresAt,
        headers: r2.headers,
      };
    }

    const signed = await this.cloudinaryService.createSignedDirectUpload({
      numeroOrden: input.numeroOrden,
      hashSha256: input.hashSha256,
      tipoEvidencia: input.tipoEvidencia,
      account: input.cloudinaryAccount,
    });

    return {
      alreadyUploaded: false,
      provider: 'CLOUDINARY',
      strategy: 'CLOUDINARY_MULTIPART',
      uploadUrl: signed.uploadUrl,
      storageKey: signed.storageKey,
      expiresAt: signed.expiresAt,
      fields: signed.fields,
    };
  }
}
