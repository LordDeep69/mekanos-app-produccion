import {
    IsNotEmpty,
    IsString,
    MaxLength,
} from 'class-validator';

export class CancelarRemisionDto {
  @IsNotEmpty({ message: 'El motivo de cancelación es requerido' })
  @IsString({ message: 'El motivo debe ser texto' })
  @MaxLength(500, {
    message: 'El motivo no puede exceder 500 caracteres',
  })
  motivo_cancelacion!: string;
}
