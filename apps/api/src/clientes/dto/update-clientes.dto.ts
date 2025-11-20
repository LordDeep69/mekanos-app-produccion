import { PartialType } from '@nestjs/mapped-types';
import { CreateClientesDto } from './create-clientes.dto';

export class UpdateClientesDto extends PartialType(CreateClientesDto) {}
