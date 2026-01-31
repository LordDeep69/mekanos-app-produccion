import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * DTO para crear firmas administrativas
 * Entidad aislada con datos de representante legal internos
 */
export class CreateFirmasAdministrativasDto {
  // 🔴 CAMPO OBLIGATORIO - Nombre de la firma
  @IsString({ message: 'nombre_de_firma debe ser texto' })
  nombre_de_firma!: string;

  // 🟠 CAMPOS OPCIONALES - Datos del representante
  @IsOptional()
  @IsString({ message: 'representante_legal debe ser texto' })
  representante_legal?: string;

  @IsOptional()
  @IsString({ message: 'contacto_de_representante_legal debe ser texto' })
  contacto_de_representante_legal?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email_representante_legal debe ser email válido' })
  email_representante_legal?: string;

  @IsOptional()
  @IsInt({ message: 'id_empleado_asignado debe ser un número entero' })
  id_empleado_asignado?: number;

  @IsOptional()
  @IsBoolean({ message: 'firma_activa debe ser booleano' })
  firma_activa?: boolean = true;

  @IsOptional()
  @IsString({ message: 'observaciones debe ser texto' })
  observaciones?: string;

  @IsOptional()
  @IsString({ message: 'requisitos_operativos debe ser texto' })
  requisitos_operativos?: string;
}
