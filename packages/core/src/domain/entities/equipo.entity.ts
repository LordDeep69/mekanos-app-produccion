import { EquipoId } from '../value-objects/equipo-id.vo';
import { CodigoEquipo } from '../value-objects/codigo-equipo.vo';
import { EstadoEquipo, EstadoEquipoEnum } from '../value-objects/estado-equipo.vo';

/**
 * Props para crear un equipo
 */
export interface CreateEquipoProps {
  codigo: string;
  marca: string;
  modelo: string;
  serie?: string;
  clienteId: number;
  sedeId?: number;
  tipoEquipoId: number;
  nombreEquipo?: string;
}

/**
 * Props completos del equipo (con ID)
 */
export interface EquipoProps extends CreateEquipoProps {
  id: number;
  estado: string;
  fechaRegistro: Date;
  ultimoMantenimiento?: Date;
}

/**
 * Equipo Entity - Agregado raíz del módulo de equipos
 * Contiene la lógica de negocio relacionada con equipos
 */
export class EquipoEntity {
  private constructor(
    private readonly _id: EquipoId,
    private readonly _codigo: CodigoEquipo,
    private _marca: string,
    private _modelo: string,
    private _serie: string | null,
    private readonly _clienteId: number,
    private readonly _sedeId: number | null,
    private readonly _tipoEquipoId: number,
    private _nombreEquipo: string | null,
    private _estado: EstadoEquipo,
    private readonly _fechaRegistro: Date,
    private _ultimoMantenimiento: Date | null
  ) {}

  /**
   * Factory method para crear un nuevo equipo
   */
  static create(props: CreateEquipoProps): EquipoEntity {
    // Validaciones de negocio
    this.validateCreateProps(props);

    return new EquipoEntity(
      EquipoId.create(), // ID autoincremental para mocks/tests
      CodigoEquipo.create(props.codigo),
      props.marca.trim().toUpperCase(),
      props.modelo.trim().toUpperCase(),
      props.serie?.trim().toUpperCase() || null,
      props.clienteId,
      props.sedeId || null,
      props.tipoEquipoId,
      props.nombreEquipo?.trim() || null,
      EstadoEquipo.operativo(),
      new Date(),
      null
    );
  }

  /**
   * Factory method para reconstruir equipo desde persistencia
   */
  static fromPersistence(props: EquipoProps): EquipoEntity {
    return new EquipoEntity(
      EquipoId.from(props.id), // Usa from() para hidratación desde DB
      CodigoEquipo.create(props.codigo),
      props.marca,
      props.modelo,
      props.serie || null,
      props.clienteId,
      props.sedeId || null,
      props.tipoEquipoId,
      props.nombreEquipo || null,
      EstadoEquipo.create(props.estado),
      props.fechaRegistro,
      props.ultimoMantenimiento || null
    );
  }

  /**
   * Validaciones de negocio al crear equipo
   */
  private static validateCreateProps(props: CreateEquipoProps): void {
    if (!props.marca || props.marca.trim().length === 0) {
      throw new Error('Marca es requerida');
    }

    if (!props.modelo || props.modelo.trim().length === 0) {
      throw new Error('Modelo es requerido');
    }

    if (props.clienteId <= 0) {
      throw new Error('ClienteId inválido');
    }

    if (props.tipoEquipoId <= 0) {
      throw new Error('TipoEquipoId inválido');
    }

    if (props.sedeId && props.sedeId <= 0) {
      throw new Error('SedeId inválido');
    }
  }

  /**
   * Lógica de negocio: Cambiar estado del equipo
   */
  cambiarEstado(nuevoEstado: EstadoEquipo): void {
    if (!this._estado.puedeTransicionarA(nuevoEstado)) {
      throw new Error(
        `No se puede transicionar de ${this._estado.getValue()} a ${nuevoEstado.getValue()}`
      );
    }

    this._estado = nuevoEstado;
  }

  /**
   * Lógica de negocio: Registrar mantenimiento
   */
  registrarMantenimiento(): void {
    if (!this._estado.puedeRecibirMantenimiento()) {
      throw new Error('Equipo no puede recibir mantenimiento en estado actual');
    }

    this._ultimoMantenimiento = new Date();
  }

  /**
   * Lógica de negocio: Activar equipo (poner en operativo)
   */
  activar(): void {
    this.cambiarEstado(EstadoEquipo.operativo());
  }

  /**
   * Lógica de negocio: Desactivar equipo (poner en inactivo)
   */
  desactivar(): void {
    this.cambiarEstado(EstadoEquipo.inactivo());
  }

  /**
   * Lógica de negocio: Marcar equipo en mantenimiento
   */
  marcarEnMantenimiento(): void {
    if (!this._estado.esOperativo() && !this._estado.equals(EstadoEquipo.standby())) {
      throw new Error('Solo equipos operativos o en standby pueden entrar en mantenimiento');
    }

    this.cambiarEstado(EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION));
  }

  /**
   * Lógica de negocio: Finalizar mantenimiento
   */
  finalizarMantenimiento(): void {
    this.cambiarEstado(EstadoEquipo.operativo());
    this._ultimoMantenimiento = new Date();
  }

  /**
   * Lógica de negocio: Dar de baja el equipo
   */
  darDeBaja(): void {
    if (!this._estado.esInactivo()) {
      throw new Error('Solo equipos inactivos pueden ser dados de baja');
    }

    this.cambiarEstado(EstadoEquipo.create(EstadoEquipoEnum.BAJA));
  }

  /**
   * Actualizar información básica del equipo
   */
  actualizarInformacion(marca?: string, modelo?: string, serie?: string, nombreEquipo?: string): void {
    if (this._estado.esBaja()) {
      throw new Error('No se puede actualizar un equipo dado de baja');
    }

    if (marca && marca.trim().length > 0) {
      this._marca = marca.trim().toUpperCase();
    }

    if (modelo && modelo.trim().length > 0) {
      this._modelo = modelo.trim().toUpperCase();
    }

    if (serie !== undefined) {
      this._serie = serie ? serie.trim().toUpperCase() : null;
    }

    if (nombreEquipo !== undefined) {
      this._nombreEquipo = nombreEquipo ? nombreEquipo.trim() : null;
    }
  }

  // Getters
  get id(): EquipoId {
    return this._id;
  }

  get codigo(): CodigoEquipo {
    return this._codigo;
  }

  get marca(): string {
    return this._marca;
  }

  get modelo(): string {
    return this._modelo;
  }

  get serie(): string | null {
    return this._serie;
  }

  get clienteId(): number {
    return this._clienteId;
  }

  get sedeId(): number | null {
    return this._sedeId;
  }

  get tipoEquipoId(): number {
    return this._tipoEquipoId;
  }

  get nombreEquipo(): string | null {
    return this._nombreEquipo;
  }

  get estado(): EstadoEquipo {
    return this._estado;
  }

  get fechaRegistro(): Date {
    return this._fechaRegistro;
  }

  get ultimoMantenimiento(): Date | null {
    return this._ultimoMantenimiento;
  }

  /**
   * Método para obtener representación simple del equipo
   */
  toObject() {
    return {
      id: this._id.getValue(),
      codigo: this._codigo.getValue(),
      marca: this._marca,
      modelo: this._modelo,
      serie: this._serie,
      clienteId: this._clienteId,
      sedeId: this._sedeId,
      tipoEquipoId: this._tipoEquipoId,
      nombreEquipo: this._nombreEquipo,
      estado: this._estado.getValue(),
      fechaRegistro: this._fechaRegistro,
      ultimoMantenimiento: this._ultimoMantenimiento,
    };
  }
}
