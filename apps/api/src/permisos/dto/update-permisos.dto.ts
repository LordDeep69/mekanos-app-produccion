import { PartialType } from '@nestjs/mapped-types';
import { CreatePermisosDto } from './create-permisos.dto';

export class UpdatePermisosDto extends PartialType(CreatePermisosDto) {}
