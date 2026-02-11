import { PartialType } from '@nestjs/swagger';
import { CreateCuentaEmailDto } from './create-cuenta-email.dto';

export class UpdateCuentaEmailDto extends PartialType(CreateCuentaEmailDto) {}
