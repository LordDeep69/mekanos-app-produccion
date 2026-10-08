import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCatalogoComponenteDto } from './create-catalogo-componente.dto';

export class UpdateCatalogoComponenteDto extends PartialType(
  OmitType(CreateCatalogoComponenteDto, ['stock_actual'] as const),
) {}

