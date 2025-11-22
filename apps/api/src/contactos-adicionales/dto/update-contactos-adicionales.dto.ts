import { PartialType } from '@nestjs/mapped-types';
import { CreateContactosAdicionalesDto } from './create-contactos-adicionales.dto';

export class UpdateContactosAdicionalesDto extends PartialType(
  CreateContactosAdicionalesDto,
) {}
