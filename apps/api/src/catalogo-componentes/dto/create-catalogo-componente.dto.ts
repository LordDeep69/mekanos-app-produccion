import { CreateArticuloMaestroDto } from './create-articulo-maestro.dto';

/**
 * DTO para crear componente en catálogo.
 * Hereda de CreateArticuloMaestroDto para proveer tipado enterprise estricto,
 * validaciones con class-validator y soporte polimórfico de destinos operativos.
 */
export class CreateCatalogoComponenteDto extends CreateArticuloMaestroDto {}

export * from './create-articulo-maestro.dto';
export * from './sourcing-proveedor.dto';
export * from './filtros-articulos.dto';
