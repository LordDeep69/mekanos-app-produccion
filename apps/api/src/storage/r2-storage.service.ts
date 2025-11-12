import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * R2StorageService
 * Servicio para almacenamiento de archivos en Cloudflare R2
 * Compatible con API S3
 */
@Injectable()
export class R2StorageService {
  private s3Client: S3Client;
  private bucketName: string;

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
  }

  /**
   * Sube un PDF al bucket R2
   * @param buffer - Buffer del PDF
   * @param filename - Nombre del archivo (incluyendo path relativo)
   * @returns URL pública del archivo
   */
  async uploadPDF(buffer: Buffer, filename: string): Promise<string> {
    const key = `ordenes/pdfs/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      // ACL: 'public-read' // R2 no soporta ACLs públicos directamente
    });

    try {
      await this.s3Client.send(command);

      // Construir URL pública
      // Formato: https://{bucket}.{account-id}.r2.cloudflarestorage.com/{key}
      const baseUrl = process.env.R2_PUBLIC_URL || `https://${this.bucketName}.r2.cloudflarestorage.com`;
      return `${baseUrl}/${key}`;

    } catch (error) {
      console.error('Error uploading PDF to R2:', error);
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
