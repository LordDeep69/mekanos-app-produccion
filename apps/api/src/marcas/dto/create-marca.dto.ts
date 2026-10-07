import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMarcaDto {
  @ApiProperty({
    description: 'Nombre único de la marca o fabricante',
    example: 'CATERPILLAR',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la marca es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción breve de la marca, especialidad o división',
    example: 'Fabricante líder de maquinaria pesada, motores diésel y componentes CAT',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'País de origen de la marca',
    example: 'Estados Unidos',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El país de origen no puede superar los 50 caracteres' })
  pais_origen?: string;

  @ApiPropertyOptional({
    description: 'Sitio web oficial del fabricante o catálogo en línea',
    example: 'https://www.cat.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'El sitio web no puede superar los 200 caracteres' })
  sitio_web?: string;

  @ApiPropertyOptional({
    description: 'URL del logotipo de la marca (Cloudinary o externo)',
    example: 'https://res.cloudinary.com/mekanos/image/upload/v1/marcas/cat.png',
  })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional({
    description: 'Indica si es fabricante de equipo original (OEM)',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'es_fabricante_oem debe ser un valor booleano' })
  es_fabricante_oem?: boolean = false;

  @ApiPropertyOptional({
    description: 'Estado activo/inactivo de la marca en el catálogo',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean = true;

  @ApiPropertyOptional({
    description: 'Identificador URL o slug único (se autogenera si se omite)',
    example: 'caterpillar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'El slug no puede superar los 120 caracteres' })
  slug?: string;
}
