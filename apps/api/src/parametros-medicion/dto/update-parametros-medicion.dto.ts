import { PartialType } from '@nestjs/swagger';
import { CreateParametrosMedicionDto } from './create-parametros-medicion.dto';

/**
 * DTO para actualizar parametros_medicion
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateParametrosMedicionDto extends PartialType(CreateParametrosMedicionDto) {}
