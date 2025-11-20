import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class EnviarCotizacionDto {
  @ApiProperty({
    description: 'Email destinatario principal',
    example: 'cliente@hotel.com',
  })
  @IsEmail({}, { message: 'Email destinatario debe ser válido' })
  destinatario_email!: string;

  @ApiProperty({
    description: 'Nombre destinatario principal',
    example: 'Hotel Caribe Plaza',
  })
  @IsString()
  @MaxLength(200)
  destinatario_nombre!: string;

  @ApiProperty({
    description: 'Emails en copia (CC)',
    example: ['gerencia@hotel.com', 'mantenimiento@hotel.com'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsEmail({}, { each: true, message: 'Cada email copia debe ser válido' })
  emails_copia?: string[];
}
