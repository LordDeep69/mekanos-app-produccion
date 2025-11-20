import { PartialType } from '@nestjs/swagger';
import { CreateSedesClienteDto } from './create-sedes-cliente.dto';

/**
 * DTO para actualizar sedes_cliente
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateSedesClienteDto extends PartialType(CreateSedesClienteDto) {}
