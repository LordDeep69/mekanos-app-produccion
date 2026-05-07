import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateMedicionDto } from './create-medicion.dto';

/**
 * DTO para actualizar medición de servicio - REFACTORIZADO
 * Tabla 10/14 - FASE 3 - camelCase
 */

export class UpdateMedicionDto extends PartialType(CreateMedicionDto) {
  // Heredados de PartialType (todos @IsOptional()):
  // - valorNumerico
  // - valorTexto
  // - observaciones
  // - temperaturaAmbiente
  // - humedadRelativa
  // - fechaMedicion
  // - instrumentoMedicion

  // ✅ FIX 04-MAY-2026: Permite al admin excluir esta medición del PDF
  @ApiPropertyOptional({ description: 'Si true, excluye esta medición del informe PDF', example: true })
  @IsOptional()
  @IsBoolean()
  excluidoPdf?: boolean;

  // ⚠️ NO se pueden actualizar manualmente:
  // - idOrdenServicio (inmutable - FK)
  // - idParametroMedicion (inmutable - FK)
  // - unidadMedida (trigger BD copia automáticamente)
  // - fueraDeRango (trigger BD recalcula automáticamente)
  // - nivelAlerta (backend recalcula automáticamente)
  // - mensajeAlerta (backend regenera automáticamente)
  // - medidoPor (auditoría inmutable - JWT original)
  // - fechaRegistro (timestamp inmutable)
}
