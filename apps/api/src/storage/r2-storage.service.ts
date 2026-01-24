import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

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
   * @param filename - Nombre del archivo (incluyendo path relativo)
   * @returns URL pública del archivo
   */
  async uploadPDF(buffer: Buffer, filename: string): Promise<string> {
    // ✅ FIX 24-ENE-2026: Verificar configuración antes de intentar subir
    if (!this.configured) {
      this.logger.warn('⚠️ R2 no configurado - No se puede subir el PDF');
      throw new Error('R2 Storage no está configurado. Configure R2_ENDPOINT, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY');
    }

    const key = `ordenes/pdfs/${filename}`;
    this.logger.log(`📤 Subiendo PDF a R2: ${key} (${buffer.length} bytes)`);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    });

    try {
      await this.s3Client.send(command);

      // Construir URL pública
      const baseUrl = process.env.R2_PUBLIC_URL || `https://${this.bucketName}.r2.cloudflarestorage.com`;
      const publicUrl = `${baseUrl}/${key}`;
      this.logger.log(`✅ PDF subido exitosamente: ${publicUrl}`);
      return publicUrl;

    } catch (error) {
      this.logger.error(`❌ Error subiendo PDF a R2: ${error}`);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to upload PDF: ${errorMessage}`);
    }
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
