// Domain - Value Objects
export { EquipoId } from './domain/value-objects/equipo-id.vo';
export { CodigoEquipo } from './domain/value-objects/codigo-equipo.vo';
export { EstadoEquipo, EstadoEquipoEnum } from './domain/value-objects/estado-equipo.vo';

// Domain - Entities
export { EquipoEntity, CreateEquipoProps, EquipoProps } from './domain/entities/equipo.entity';

// Domain - Repositories (Ports)
export { IEquipoRepository, FindEquiposFilters } from './domain/repositories/equipo.repository';
