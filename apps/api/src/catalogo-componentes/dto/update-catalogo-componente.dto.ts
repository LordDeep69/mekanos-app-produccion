import { PartialType } from '@nestjs/mapped-types';
import { CreateCatalogoComponenteDto } from './create-catalogo-componente.dto';

export class UpdateCatalogoComponenteDto extends PartialType(CreateCatalogoComponenteDto) {}
