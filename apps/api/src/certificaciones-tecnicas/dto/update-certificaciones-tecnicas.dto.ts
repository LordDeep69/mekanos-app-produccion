import { PartialType } from '@nestjs/mapped-types';
import { CreateCertificacionesTecnicasDto } from './create-certificaciones-tecnicas.dto';

export class UpdateCertificacionesTecnicasDto extends PartialType(
  CreateCertificacionesTecnicasDto,
) {}
