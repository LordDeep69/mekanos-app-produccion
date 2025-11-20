import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

/**
 * CloudinaryService - Upload real imágenes a Cloudinary CDN
 * FASE 4.3 - Retorna secure_url para guardar en ruta_archivo
 */

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    // Configurar Cloudinary con credenciales ENV (cuenta PLANTAS)
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME_PLANTAS'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY_PLANTAS'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET_PLANTAS'),
    });
  }

  /**
   * Upload imagen desde buffer a Cloudinary
   * @param buffer - Buffer de archivo (req.file.buffer)
   * @param folder - Carpeta en Cloudinary (ej: 'mekanos/evidencias/orden-123')
   * @returns Promise<secure_url> - URL pública de imagen
   */
  async uploadImage(
    buffer: Buffer,
    folder: string,
  ): Promise<{ secure_url: string; public_id: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          format: 'jpg', // Convertir todas a JPG
          quality: 'auto:good', // Compresión automática
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' }, // Max 1920x1080
          ],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            reject(error || new Error('Cloudinary upload failed'));
          } else {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
              width: result.width,
              height: result.height,
            });
          }
        },
      );

      // Stream buffer a Cloudinary
      uploadStream.end(buffer);
    });
  }

  /**
   * Generar miniatura (thumbnail) de imagen existente
   * @param publicId - public_id de Cloudinary (sin extensión)
   * @returns URL miniatura 200x200
   */
  generateThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      width: 200,
      height: 200,
      crop: 'fill',
      format: 'jpg',
    });
  }

  /**
   * Eliminar imagen de Cloudinary
   * @param publicId - public_id de Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
