import { CreateEvidenciaDto } from '../../dto/create-evidencia.dto';

/**
 * Command crear evidencia con upload Cloudinary
 * FASE 4.3 - Incluye file buffer + userId para capturada_por
 */

export class CreateEvidenciaCommand {
  constructor(
    public readonly dto: CreateEvidenciaDto,
    public readonly file: Express.Multer.File, // Buffer + originalname + mimetype + size
    public readonly userId: number,
  ) {}
}
