import { PartialType } from '@nestjs/mapped-types';
import { CreateFirmasAdministrativasDto } from './create-firmas-administrativas.dto';

export class UpdateFirmasAdministrativasDto extends PartialType(
  CreateFirmasAdministrativasDto,
) {}
