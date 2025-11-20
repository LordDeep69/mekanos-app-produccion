import { PartialType } from '@nestjs/swagger';
import { CreateAlertasStockDto } from './create-alertas-stock.dto';

/**
 * DTO para actualizar alertas_stock
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateAlertasStockDto extends PartialType(CreateAlertasStockDto) {}
