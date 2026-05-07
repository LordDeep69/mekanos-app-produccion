import { CopyObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Readable } from 'node:stream';

/**
 * R2StorageService
 * Servicio para almacenamiento de archivos en Cloudflare R2
 * Compatible con API S3
 */
@Injectable()
export class R2StorageService implements OnModuleInit {
  private readonly logger = new Logger(R2StorageService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private configured: boolean = false;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME || 'mekanos-plantas-produccion';

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
      }
    });

    this.configured = this.isConfigured();
  }

  onModuleInit() {
    this.logger.log('🔧 [R2StorageService] Verificando configuración...');
    this.logger.log(`   R2_ENDPOINT: ${process.env.R2_ENDPOINT ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
    this.logger.log(`   R2_ACCESS_KEY_ID: ${process.env.R2_ACCESS_KEY_ID ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
    this.logger.log(`   R2_SECRET_ACCESS_KEY: ${process.env.R2_SECRET_ACCESS_KEY ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
    this.logger.log(`   R2_BUCKET_NAME: ${this.bucketName}`);
    this.logger.log(`   R2_PUBLIC_URL: ${process.env.R2_PUBLIC_URL || '❌ NO CONFIGURADO'}`);

    if (this.configured) {
      this.logger.log('✅ [R2StorageService] Configuración completa');
    } else {
      this.logger.warn('⚠️ [R2StorageService] Configuración incompleta - Los PDFs NO se subirán a R2');
    }
  }

  /**
   * Sube un PDF al bucket R2
   * @param buffer - Buffer del PDF
   * @param filename - Path/key relativo dentro de `ordenes/pdfs/` (sin prefijo)
   * @param options - Opcionales: nombre de descarga sugerido (Content-Disposition)
   * @returns URL pública del archivo
   */
  async uploadPDF(
    buffer: Buffer,
    filename: string,
    options?: { downloadFilename?: string },
  ): Promise<string> {
    // ✅ FIX 24-ENE-2026: Verificar configuración antes de intentar subir
    if (!this.configured) {
      this.logger.warn('⚠️ R2 no configurado - No se puede subir el PDF');
      throw new Error('R2 Storage no está configurado. Configure R2_ENDPOINT, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY');
    }

    const key = `ordenes/pdfs/${filename}`;
    this.logger.log(`📤 Subiendo PDF a R2: ${key} (${buffer.length} bytes)`);

    // ✅ Permite que al descargar el PDF el navegador use el nombre canónico
    //    (Sin esto, el "download" attribute es ignorado por ser cross-origin).
    const contentDisposition = options?.downloadFilename
      ? this.buildContentDispositionHeader(options.downloadFilename)
      : undefined;

    const putCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      ContentDisposition: contentDisposition,
    });

    try {
      await this.s3Client.send(putCommand);
      this.logger.log(`✅ PDF subido a R2: ${key}`);
      if (options?.downloadFilename) {
        this.logger.log(`   📎 Content-Disposition: ${options.downloadFilename}`);
      }

      // ✅ FIX 24-ENE-2026: URLs permanentes si R2_PUBLIC_URL está configurado
      // El usuario debe habilitar "Public Access" en Cloudflare R2 Dashboard
      if (process.env.R2_PUBLIC_URL) {
        const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
        this.logger.log(`🔗 URL pública permanente: ${publicUrl}`);
        return publicUrl;
      }

      // Fallback: URL firmada (7 días) si no hay acceso público
      this.logger.warn('⚠️ R2_PUBLIC_URL no configurado - usando URL firmada (expira en 7 días)');
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const signedUrl = await getSignedUrl(this.s3Client, getCommand, { expiresIn: 604800 });
      return signedUrl;

    } catch (error) {
      this.logger.error(`❌ Error subiendo PDF a R2: ${error}`);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to upload PDF: ${errorMessage}`);
    }
  }

  /**
   * Actualiza in-place el header Content-Disposition de un objeto existente
   * en R2 (vía CopyObject con MetadataDirective=REPLACE).
   *
   * Caso de uso: migrar los PDFs históricos para que al descargarlos el
   * navegador sugiera el nombre canónico (`INFORME - DDMM-YY - ... - YYYY.pdf`).
   *
   * @param key - R2 object key (ej: `ordenes/pdfs/OS-202604-0134/informe_xxx.pdf`)
   * @param downloadFilename - Nombre sugerido al descargar
   */
  async updateDownloadFilename(key: string, downloadFilename: string): Promise<void> {
    if (!this.configured) {
      throw new Error('R2 Storage no está configurado.');
    }

    const command = new CopyObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      CopySource: `${this.bucketName}/${encodeURI(key)}`,
      ContentType: 'application/pdf',
      ContentDisposition: this.buildContentDispositionHeader(downloadFilename),
      MetadataDirective: 'REPLACE',
    });

    await this.s3Client.send(command);
  }

  /**
   * Descarga el contenido binario de un objeto en R2.
   * Usado por el endpoint proxy de descarga para servir el PDF con el
   * Content-Disposition correcto, sin depender de la metadata del objeto.
   */
  async downloadPDF(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (!this.configured) {
      throw new Error('R2 Storage no está configurado.');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
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
   */
  async streamPDF(key: string): Promise<{ stream: Readable; contentType: string; contentLength?: number }> {
    if (!this.configured) {
      throw new Error('R2 Storage no está configurado.');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const nodeStream = response.Body as NodeJS.ReadableStream;

    // Convertir el web stream a Node Readable para compatibilidad con Express
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
  async existsObject(key: string): Promise<boolean> {
    if (!this.configured) return false;
    try {
      await this.s3Client.send(new HeadObjectCommand({ Bucket: this.bucketName, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Construye el header Content-Disposition compatible con RFC 5987.
   * Permite caracteres especiales y espacios en cualquier navegador moderno.
   */
  private buildContentDispositionHeader(filename: string): string {
    const safe = filename.replace(/"/g, '');
    return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
  }

  /**
   * Genera una URL firmada con expiración
   * @param filename - Nombre del archivo
   * @param expiresIn - Tiempo de expiración en segundos (default: 7 días)
   * @returns URL firmada
   */
  async getSignedURL(filename: string, expiresIn: number = 604800): Promise<string> {
    const key = `ordenes/pdfs/${filename}`;

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    try {
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;

    } catch (error) {
      console.error('Error generating signed URL:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate signed URL: ${errorMessage}`);
    }
  }

  /**
   * Genera una URL firmada de previsualización (Content-Disposition: inline).
   * El navegador mostrará el PDF directamente sin descargarlo.
   * @param key - R2 object key completo (ej: ordenes/pdfs/...)
   * @param expiresIn - Tiempo de expiración en segundos (default: 1 hora)
   * @returns URL firmada con ResponseContentDisposition=inline
   */
  async getSignedPreviewUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.configured) {
      throw new Error('R2 Storage no está configurado.');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ResponseContentDisposition: 'inline',
      ResponseContentType: 'application/pdf',
    });

    try {
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Error generando URL de previsualización: ${errorMessage}`);
      throw new Error(`Failed to generate preview URL: ${errorMessage}`);
    }
  }

  /**
   * Verifica la configuración del servicio
   * @returns true si está configurado correctamente
   */
  isConfigured(): boolean {
    return !!(
      process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
    );
  }
}
