import { PartialType } from '@nestjs/swagger';
import { CreateMotivosRechazoDto } from './create-motivos-rechazo.dto';

/**
 * DTO para actualizar motivos_rechazo
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateMotivosRechazoDto extends PartialType(CreateMotivosRechazoDto) {}
