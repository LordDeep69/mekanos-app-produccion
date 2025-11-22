import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export enum EstadoUsuarioEnum {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  PENDIENTE_ACTIVACION = 'PENDIENTE_ACTIVACION',
}

export class CreateUsuariosDto {
  @IsInt()
  id_persona: number;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(255)
  password: string;

  @IsOptional()
  @IsBoolean()
  debe_cambiar_password?: boolean = true;

  @IsOptional()
  @IsEnum(EstadoUsuarioEnum)
  estado?: EstadoUsuarioEnum = EstadoUsuarioEnum.PENDIENTE_ACTIVACION;
}
