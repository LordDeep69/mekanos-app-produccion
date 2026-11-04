import { CopyObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Readable } from 'node:stream';

export type R2Account = 'PLANTAS' | 'BOMBAS';

/**
 * R2StorageService
 * Servicio para almacenamiento de archivos en Cloudflare R2
 * Compatible con API S3 y arquitectura Multi-Bucket (PLANTAS y BOMBAS).
 *
 * ✅ RESILIENCIA ZERO-TRUST:
 * Soporta resolución canónica R2_* y perfiles R2_PLANTAS_* / R2_BOMBAS_*
 * con fallback bidireccional transparente.
 */
@Injectable()
export class R2StorageService implements OnModuleInit {
  private readonly logger = new Logger(R2StorageService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private configured: boolean = false;

  // Clientes y buckets específicos
  private s3ClientPlantas: S3Client | null = null;
  private bucketPlantas: string = 'mekanos-plantas-produccion';
  private configuredPlantas: boolean = false;

  private s3ClientBombas: S3Client | null = null;
  private bucketBombas: string = 'mekanos-bombas-produccion';
  private configuredBombas: boolean = false;

  constructor() {
    // 1. Configurar perfil PLANTAS / Primario
    const endpointPlantas = process.env.R2_ENDPOINT || process.env.R2_PLANTAS_ENDPOINT;
    const accessKeyIdPlantas = process.env.R2_ACCESS_KEY_ID || process.env.R2_PLANTAS_ACCESS_KEY_ID || '';
    const secretAccessKeyPlantas = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_PLANTAS_SECRET_ACCESS_KEY || '';
    this.bucketPlantas = process.env.R2_BUCKET_NAME || process.env.R2_PLANTAS_BUCKET_NAME || 'mekanos-plantas-produccion';

    this.configuredPlantas = !!(endpointPlantas && accessKeyIdPlantas && secretAccessKeyPlantas);

    if (this.configuredPlantas) {
      this.s3ClientPlantas = new S3Client({
        region: 'auto',
        endpoint: endpointPlantas,
        credentials: {
          accessKeyId: accessKeyIdPlantas,
          secretAccessKey: secretAccessKeyPlantas,
        },
      });
    }

    // 2. Configurar perfil BOMBAS
    const endpointBombas = process.env.R2_BOMBAS_ENDPOINT;
    const accessKeyIdBombas = process.env.R2_BOMBAS_ACCESS_KEY_ID || '';
    const secretAccessKeyBombas = process.env.R2_BOMBAS_SECRET_ACCESS_KEY || '';
    this.bucketBombas = process.env.R2_BOMBAS_BUCKET_NAME || 'mekanos-bombas-produccion';

    this.configuredBombas = !!(endpointBombas && accessKeyIdBombas && secretAccessKeyBombas);

    if (this.configuredBombas) {
      this.s3ClientBombas = new S3Client({
        region: 'auto',
        endpoint: endpointBombas,
        credentials: {
          accessKeyId: accessKeyIdBombas,
          secretAccessKey: secretAccessKeyBombas,
        },
      });
    }

    // 3. Cliente por defecto (retrocompatibilidad)
    this.s3Client = this.s3ClientPlantas || this.s3ClientBombas || new S3Client({
      region: 'auto',
      endpoint: endpointPlantas || 'https://r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: accessKeyIdPlantas,
        secretAccessKey: secretAccessKeyPlantas,
      },
    });
    this.bucketName = this.configuredPlantas ? this.bucketPlantas : this.bucketBombas;
    this.configured = this.configuredPlantas || this.configuredBombas;
  }

  onModuleInit() {
    this.logger.log('🔧 [R2StorageService] Verificando configuración...');
    this.logger.log(`   R2 PLANTAS: ${this.configuredPlantas ? `✅ Configurado (${this.bucketPlantas})` : '❌ NO CONFIGURADO'}`);
    this.logger.log(`   R2 BOMBAS:  ${this.configuredBombas ? `✅ Configurado (${this.bucketBombas})` : '❌ NO CONFIGURADO'}`);
    this.logger.log(`   R2_PUBLIC_URL: ${process.env.R2_PUBLIC_URL || '❌ NO CONFIGURADO'}`);

    if (this.configured) {
      this.logger.log('✅ [R2StorageService] Inicialización completa');
    } else {
      this.logger.warn('⚠️ [R2StorageService] Configuración incompleta - Los PDFs NO se subirán a R2');
    }
  }

  /**
   * Resuelve el cliente S3 y el bucket adecuado según la cuenta o la clave
   */
  private resolveClientAndBucket(key?: string, account?: R2Account): { client: S3Client; bucket: string; account: R2Account } {
    if (!this.configured) {
      throw new Error('R2 Storage no está configurado. Verifique R2_ENDPOINT o R2_PLANTAS_ENDPOINT.');
    }

    if (account === 'BOMBAS' && this.configuredBombas && this.s3ClientBombas) {
      return { client: this.s3ClientBombas, bucket: this.bucketBombas, account: 'BOMBAS' };
    }

    if (account === 'PLANTAS' && this.configuredPlantas && this.s3ClientPlantas) {
      return { client: this.s3ClientPlantas, bucket: this.bucketPlantas, account: 'PLANTAS' };
    }

    // Heurística si no se especificó cuenta
    if (key && (key.toLowerCase().includes('bomba') || key.includes('BOMBAS')) && this.configuredBombas && this.s3ClientBombas) {
      return { client: this.s3ClientBombas, bucket: this.bucketBombas, account: 'BOMBAS' };
    }

    if (this.configuredPlantas && this.s3ClientPlantas) {
      return { client: this.s3ClientPlantas, bucket: this.bucketPlantas, account: 'PLANTAS' };
    }

    if (this.configuredBombas && this.s3ClientBombas) {
      return { client: this.s3ClientBombas, bucket: this.bucketBombas, account: 'BOMBAS' };
    }

    return { client: this.s3Client, bucket: this.bucketName, account: 'PLANTAS' };
  }

  /**
   * Sube un PDF al bucket R2
   * @param buffer - Buffer del PDF
   * @param filename - Path/key relativo dentro de `ordenes/pdfs/` (sin prefijo)
   * @param options - Opcionales: nombre de descarga sugerido y cuenta destino
   * @returns URL pública del archivo
   */
  async uploadPDF(
    buffer: Buffer,
    filename: string,
    options?: { downloadFilename?: string; account?: R2Account },
  ): Promise<string> {
    if (!this.configured) {
      this.logger.warn('⚠️ R2 no configurado - No se puede subir el PDF');
      throw new Error('R2 Storage no está configurado. Configure R2_ENDPOINT o R2_PLANTAS_ENDPOINT en el entorno.');
    }

    const { client, bucket } = this.resolveClientAndBucket(filename, options?.account);
    const key = `ordenes/pdfs/${filename}`;
    this.logger.log(`📤 Subiendo PDF a R2 (${bucket}): ${key} (${buffer.length} bytes)`);

    const contentDisposition = options?.downloadFilename
      ? this.buildContentDispositionHeader(options.downloadFilename)
      : undefined;

    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      ContentDisposition: contentDisposition,
    });

    try {
      await client.send(putCommand);
      this.logger.log(`✅ PDF subido a R2: ${key}`);
      if (options?.downloadFilename) {
        this.logger.log(`   📎 Content-Disposition: ${options.downloadFilename}`);
      }

      if (process.env.R2_PUBLIC_URL) {
        const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
        this.logger.log(`🔗 URL pública permanente: ${publicUrl}`);
        return publicUrl;
      }

      this.logger.warn('⚠️ R2_PUBLIC_URL no configurado - usando URL firmada (expira en 7 días)');
      const getCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const signedUrl = await getSignedUrl(client, getCommand, { expiresIn: 604800 });
      return signedUrl;

    } catch (error) {
      this.logger.error(`❌ Error subiendo PDF a R2: ${error}`);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to upload PDF: ${errorMessage}`);
    }
  }

  /**
   * Actualiza in-place el header Content-Disposition de un objeto existente en R2
   */
  async updateDownloadFilename(
    key: string,
    downloadFilename: string,
    options?: { account?: R2Account },
  ): Promise<void> {
    if (!this.configured) {
      throw new Error('R2 Storage no está configurado.');
    }

    const { client, bucket } = this.resolveClientAndBucket(key, options?.account);

    const command = new CopyObjectCommand({
      Bucket: bucket,
      Key: key,
      CopySource: `${bucket}/${encodeURI(key)}`,
      ContentType: 'application/pdf',
      ContentDisposition: this.buildContentDispositionHeader(downloadFilename),
      MetadataDirective: 'REPLACE',
    });

    await client.send(command);
  }

  /**
   * Descarga el contenido binario de un objeto en R2.
   * Con fallback automático entre buckets si no se encuentra en el primero.
   */
  async downloadPDF(
    key: string,
    options?: { account?: R2Account },
  ): Promise<{ buffer: Buffer; contentType: string }> {
    if (!this.configured) {
      throw new Error('R2 Storage no está configurado.');
    }

    const primary = this.resolveClientAndBucket(key, options?.account);

    try {
      return await this.fetchObjectBuffer(primary.client, primary.bucket, key);
    } catch (error: unknown) {
      // Fallback zero-trust a la cuenta alterna si está disponible
      const isNotFound = error instanceof Error && (error.name === 'NoSuchKey' || error.message.includes('NoSuchKey'));
      if (isNotFound && !options?.account) {
        const fallbackAccount: R2Account = primary.account === 'PLANTAS' ? 'BOMBAS' : 'PLANTAS';
        const isFallbackConfigured = fallbackAccount === 'BOMBAS' ? this.configuredBombas : this.configuredPlantas;
        if (isFallbackConfigured) {
          const secondary = this.resolveClientAndBucket(key, fallbackAccount);
          this.logger.debug(`Reintentando descarga en bucket secundario ${secondary.bucket} para ${key}`);
          return await this.fetchObjectBuffer(secondary.client, secondary.bucket, key);
        }
      }
      throw error;
    }
  }

  private async fetchObjectBuffer(client: S3Client, bucket: string, key: string): Promise<{ buffer: Buffer; contentType: string }> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);
    const stream = response.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk as Uint8Array));
    }
    return {
      buffer: Buffer.concat(chunks),
      contentType: response.ContentType || 'application/pdf',
    };
  }

  /**
   * Obtiene un stream legible de un objeto en R2 sin cargarlo en memoria.
   * Ideal para previsualización con pipe directo a la respuesta HTTP.
   * Con fallback automático entre buckets si no se encuentra en el primero.
   */
  async streamPDF(
    key: string,
    options?: { account?: R2Account },
  ): Promise<{ stream: Readable; contentType: string; contentLength?: number }> {
    if (!this.configured) {
      throw new Error('R2 Storage no está configurado.');
    }

    const primary = this.resolveClientAndBucket(key, options?.account);

    try {
      return await this.fetchObjectStream(primary.client, primary.bucket, key);
    } catch (error: unknown) {
      const isNotFound = error instanceof Error && (error.name === 'NoSuchKey' || error.message.includes('NoSuchKey'));
      if (isNotFound && !options?.account) {
        const fallbackAccount: R2Account = primary.account === 'PLANTAS' ? 'BOMBAS' : 'PLANTAS';
        const isFallbackConfigured = fallbackAccount === 'BOMBAS' ? this.configuredBombas : this.configuredPlantas;
        if (isFallbackConfigured) {
          const secondary = this.resolveClientAndBucket(key, fallbackAccount);
          this.logger.debug(`Reintentando streaming en bucket secundario ${secondary.bucket} para ${key}`);
          return await this.fetchObjectStream(secondary.client, secondary.bucket, key);
        }
      }
      throw error;
    }
  }

  private async fetchObjectStream(client: S3Client, bucket: string, key: string): Promise<{ stream: Readable; contentType: string; contentLength?: number }> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);
    const nodeStream = response.Body as NodeJS.ReadableStream;
    const readable = Readable.from(nodeStream);

    return {
      stream: readable,
      contentType: response.ContentType || 'application/pdf',
      contentLength: response.ContentLength,
    };
  }

  /**
   * Verifica que un objeto existe en R2 sin descargarlo.
   */
  async existsObject(key: string, options?: { account?: R2Account }): Promise<boolean> {
    if (!this.configured) return false;
    const primary = this.resolveClientAndBucket(key, options?.account);
    try {
      await primary.client.send(new HeadObjectCommand({ Bucket: primary.bucket, Key: key }));
      return true;
    } catch {
      if (!options?.account) {
        const fallbackAccount: R2Account = primary.account === 'PLANTAS' ? 'BOMBAS' : 'PLANTAS';
        const isFallbackConfigured = fallbackAccount === 'BOMBAS' ? this.configuredBombas : this.configuredPlantas;
        if (isFallbackConfigured) {
          try {
            const secondary = this.resolveClientAndBucket(key, fallbackAccount);
            await secondary.client.send(new HeadObjectCommand({ Bucket: secondary.bucket, Key: key }));
            return true;
          } catch {
            return false;
          }
        }
      }
      return false;
    }
  }

  /**
   * Construye el header Content-Disposition compatible con RFC 5987.
   */
  private buildContentDispositionHeader(filename: string): string {
    const asciiSafe = filename
      .replace(/"/g, '')
      .replace(/[^\x20-\x7E]/g, '');
    return `attachment; filename="${asciiSafe}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
  }

  /**
   * Genera una URL firmada con expiración
   */
  async getSignedURL(filename: string, expiresIn: number = 604800, options?: { account?: R2Account }): Promise<string> {
    const key = `ordenes/pdfs/${filename}`;
    const { client, bucket } = this.resolveClientAndBucket(key, options?.account);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    try {
      const signedUrl = await getSignedUrl(client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      this.logger.error('Error generating signed URL:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate signed URL: ${errorMessage}`);
    }
  }

  /**
   * Genera una URL firmada de previsualización (Content-Disposition: inline).
   * El navegador mostrará el PDF directamente sin descargarlo.
   */
  async getSignedPreviewUrl(key: string, expiresIn: number = 3600, options?: { account?: R2Account }): Promise<string> {
    if (!this.configured) {
      throw new Error('R2 Storage no está configurado.');
    }

    const { client, bucket } = this.resolveClientAndBucket(key, options?.account);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: 'inline',
      ResponseContentType: 'application/pdf',
    });

    try {
      const signedUrl = await getSignedUrl(client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Error generando URL de previsualización: ${errorMessage}`);
      throw new Error(`Failed to generate preview URL: ${errorMessage}`);
    }
  }

  /**
   * Verifica la configuración del servicio
   */
  isConfigured(): boolean {
    const endpointPlantas = process.env.R2_ENDPOINT || process.env.R2_PLANTAS_ENDPOINT;
    const accessKeyIdPlantas = process.env.R2_ACCESS_KEY_ID || process.env.R2_PLANTAS_ACCESS_KEY_ID;
    const secretAccessKeyPlantas = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_PLANTAS_SECRET_ACCESS_KEY;
    const plantasOk = !!(endpointPlantas && accessKeyIdPlantas && secretAccessKeyPlantas);

    const endpointBombas = process.env.R2_BOMBAS_ENDPOINT;
    const accessKeyIdBombas = process.env.R2_BOMBAS_ACCESS_KEY_ID;
    const secretAccessKeyBombas = process.env.R2_BOMBAS_SECRET_ACCESS_KEY;
    const bombasOk = !!(endpointBombas && accessKeyIdBombas && secretAccessKeyBombas);

    return plantasOk || bombasOk;
  }
}
