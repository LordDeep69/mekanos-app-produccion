import { PartialType } from '@nestjs/mapped-types';
import { CreateEmpleadosDto } from './create-empleados.dto';

export class UpdateEmpleadosDto extends PartialType(CreateEmpleadosDto) {}
