// Domain - Value Objects
export { EquipoId } from './domain/value-objects/equipo-id.vo';
export { CodigoEquipo } from './domain/value-objects/codigo-equipo.vo';
export { EstadoEquipo, EstadoEquipoEnum } from './domain/value-objects/estado-equipo.vo';

// Domain - Value Objects (Órdenes)
export { OrdenServicioId } from './domain/value-objects/orden-servicio-id.vo';
export { NumeroOrden } from './domain/value-objects/numero-orden.vo';
export { EstadoOrden, EstadoOrdenEnum } from './domain/value-objects/estado-orden.vo';
export { PrioridadOrden, PrioridadOrdenEnum } from './domain/value-objects/prioridad-orden.vo';

// Domain - Entities
export { EquipoEntity, CreateEquipoProps, EquipoProps } from './domain/entities/equipo.entity';

// Domain - Entities (Órdenes)
export { OrdenServicioEntity, CreateOrdenServicioProps, OrdenServicioProps } from './domain/entities/orden-servicio.entity';

// Domain - Repositories (Ports)
export { IEquipoRepository, FindEquiposFilters } from './domain/repositories/equipo.repository';

// Domain - Repositories (Órdenes)
export { IOrdenServicioRepository, FindOrdenesFilters } from './domain/repositories/orden-servicio.repository';
