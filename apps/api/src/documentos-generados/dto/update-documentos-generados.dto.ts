import { PartialType } from '@nestjs/swagger';
import { CreateDocumentosGeneradosDto } from './create-documentos-generados.dto';

/**
 * DTO para actualizar documentos_generados
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateDocumentosGeneradosDto extends PartialType(CreateDocumentosGeneradosDto) {}
