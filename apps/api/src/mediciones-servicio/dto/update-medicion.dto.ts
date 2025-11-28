import { PartialType } from '@nestjs/swagger';
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
