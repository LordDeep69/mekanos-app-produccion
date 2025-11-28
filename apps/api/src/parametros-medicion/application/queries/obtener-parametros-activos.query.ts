import { IQuery } from '@nestjs/cqrs';

/**
 * Query: Obtener solo parámetros de medición activos
 * Retorna array sin paginación, ordenado por categoría
 */
export class ObtenerParametrosActivosQuery implements IQuery {}
