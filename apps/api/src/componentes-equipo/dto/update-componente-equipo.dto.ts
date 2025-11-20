import { PartialType } from '@nestjs/mapped-types';
import { CreateComponenteEquipoDto } from './create-componente-equipo.dto';

export class UpdateComponenteEquipoDto extends PartialType(CreateComponenteEquipoDto) {}
