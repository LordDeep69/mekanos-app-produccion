import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';

export class FusionarMarcasDto {
  @ApiProperty({
    description: 'ID de la marca redundante/origen cuyos repuestos serán migrados',
    example: 2,
  })
  @IsInt({ message: 'El ID de la marca origen debe ser un entero' })
  @IsPositive({ message: 'El ID de la marca origen debe ser positivo' })
  id_marca_origen: number;

  @ApiProperty({
    description: 'ID de la marca canónica/destino que recibirá los repuestos',
    example: 1,
  })
  @IsInt({ message: 'El ID de la marca destino debe ser un entero' })
  @IsPositive({ message: 'El ID de la marca destino debe ser positivo' })
  id_marca_destino: number;

  @ApiPropertyOptional({
    description: 'Si es true, elimina físicamente la marca origen una vez transferidos los repuestos. Si es false, la desactiva.',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  eliminar_origen?: boolean = true;
}
