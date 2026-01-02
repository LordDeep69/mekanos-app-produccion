import { EstadoOrden, EstadoOrdenEnum } from '../value-objects/estado-orden.vo';
import { NumeroOrden } from '../value-objects/numero-orden.vo';
import { OrdenServicioId } from '../value-objects/orden-servicio-id.vo';
import { PrioridadOrden, PrioridadOrdenEnum } from '../value-objects/prioridad-orden.vo';

/**
 * Props para crear una nueva Orden de Servicio
 */
export interface CreateOrdenServicioProps {
  numeroOrden: string;
  equipoId: number;
  clienteId: number;
  sedeClienteId?: number;
  tipoServicioId: number;
  descripcion?: string;
  prioridad?: PrioridadOrdenEnum;
  fechaProgramada?: Date;
  userId?: number;
}

/**
 * Props completos de una Orden de Servicio (para hidratación)
 */
export interface OrdenServicioProps {
  id: string;
  numeroOrden: string;
  estado: EstadoOrdenEnum;
  prioridad: PrioridadOrdenEnum;
  equipoId: number;
  clienteId: number;
  sedeClienteId?: number;
  tipoServicioId: number;
  descripcion?: string;
  fechaProgramada?: Date;
  tecnicoAsignadoId?: number;
  fechaInicio?: Date;
  fechaFin?: Date;
  observaciones?: string;
  firmaClienteUrl?: string;
  createdAt: Date;
  updatedAt?: Date;
  userId?: number;
}

/**
 * Entity: OrdenServicioEntity
 * Aggregate Root para el módulo de Órdenes de Servicio
 * 
 * Workflow:
 * BORRADOR → PROGRAMADA → ASIGNADA → EN_PROCESO → EJECUTADA → EN_REVISION → APROBADA
 */
export class OrdenServicioEntity {
  private constructor(
    private readonly _id: OrdenServicioId,
    private readonly _numeroOrden: NumeroOrden,
    private _estado: EstadoOrden,
    private _prioridad: PrioridadOrden,
    private readonly _equipoId: number,
    private readonly _clienteId: number,
    private readonly _sedeClienteId: number | null,
    private readonly _tipoServicioId: number,
    private _descripcion: string | null,
    private _fechaProgramada: Date | null,
    private _tecnicoAsignadoId: number | null,
    private _fechaInicio: Date | null,
    private _fechaFin: Date | null,
    private _observaciones: string | null,
    private _firmaClienteUrl: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date | null,
    private readonly _userId: number | null
  ) { }

  /**
   * Factory method para crear una nueva Orden de Servicio
   */
  static create(props: CreateOrdenServicioProps): OrdenServicioEntity {
    // Validaciones de negocio
    this.validateCreateProps(props);

    return new OrdenServicioEntity(
      OrdenServicioId.create(),
      NumeroOrden.from(props.numeroOrden),
      EstadoOrden.borrador(), // Estado inicial siempre BORRADOR
      props.prioridad ? PrioridadOrden.from(props.prioridad) : PrioridadOrden.normal(),
      props.equipoId,
      props.clienteId,
      props.sedeClienteId || null,
      props.tipoServicioId,
      props.descripcion?.trim() || null,
      props.fechaProgramada || null,
      null, // Sin técnico asignado al crear
      null, // Sin fecha inicio
      null, // Sin fecha fin
      null, // Sin observaciones
      null, // Sin firma
      new Date(),
      null,
      props.userId || null
    );
  }

  /**
   * Factory method para reconstruir orden desde persistencia
   */
  static fromPersistence(props: OrdenServicioProps): OrdenServicioEntity {
    return new OrdenServicioEntity(
      OrdenServicioId.from(props.id),
      NumeroOrden.from(props.numeroOrden),
      EstadoOrden.from(props.estado),
      PrioridadOrden.from(props.prioridad),
      props.equipoId,
      props.clienteId,
      props.sedeClienteId || null,
      props.tipoServicioId,
      props.descripcion || null,
      props.fechaProgramada || null,
      props.tecnicoAsignadoId || null,
      props.fechaInicio || null,
      props.fechaFin || null,
      props.observaciones || null,
      props.firmaClienteUrl || null,
      props.createdAt,
      props.updatedAt || null,
      props.userId || null
    );
  }

  private static validateCreateProps(props: CreateOrdenServicioProps): void {
    if (!props.numeroOrden?.trim()) {
      throw new Error('Número de orden es requerido');
    }

    if (!props.equipoId || props.equipoId <= 0) {
      throw new Error('EquipoId inválido');
    }

    if (!props.clienteId || props.clienteId <= 0) {
      throw new Error('ClienteId inválido');
    }

    if (!props.tipoServicioId || props.tipoServicioId <= 0) {
      throw new Error('TipoServicioId inválido');
    }

    // Validar fecha programada si se proporciona
    if (props.fechaProgramada) {
      const fecha = new Date(props.fechaProgramada);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Permitir fechas desde ayer para evitar problemas de desfase horario (UTC vs Local)
      // durante la validación de "hoy"
      const limitePasado = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);

      if (fecha < limitePasado) {
        throw new Error('Fecha programada no puede ser en el pasado');
      }
    }
  }

  // ==================== MÉTODOS DE WORKFLOW ====================

  /**
   * BORRADOR → PROGRAMADA
   * Programa la orden asignando una fecha
   */
  programar(fechaProgramada: Date, observaciones?: string): void {
    if (!this._estado.esBorrador()) {
      throw new Error(
        `No se puede programar una orden en estado ${this._estado.getValue()}`
      );
    }

    // Validar fecha futura
    const fecha = new Date(fechaProgramada);
    if (fecha < new Date()) {
      throw new Error('Fecha programada debe ser futura');
    }

    // Validar que no sea más de 90 días en futuro
    const diasFuturo = Math.ceil(
      (fecha.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diasFuturo > 90) {
      throw new Error('Fecha programada no puede ser más de 90 días en el futuro');
    }

    this._fechaProgramada = fecha;
    this._observaciones = observaciones?.trim() || this._observaciones;
    this._estado = EstadoOrden.programada();
    this._updatedAt = new Date();
  }

  /**
   * PROGRAMADA → ASIGNADA
   * Asigna un técnico a la orden
   */
  asignarTecnico(tecnicoId: number): void {
    if (!this._estado.esProgramada()) {
      throw new Error(
        `No se puede asignar técnico a una orden en estado ${this._estado.getValue()}`
      );
    }

    if (!tecnicoId || tecnicoId <= 0) {
      throw new Error('TecnicoId inválido');
    }

    if (!this._fechaProgramada) {
      throw new Error('Debe programar la orden antes de asignar técnico');
    }

    this._tecnicoAsignadoId = tecnicoId;
    this._estado = EstadoOrden.asignada();
    this._updatedAt = new Date();
  }

  /**
   * ASIGNADA → EN_PROCESO
   * Inicia la ejecución de la orden
   */
  iniciar(): void {
    if (!this._estado.esAsignada()) {
      throw new Error(
        `No se puede iniciar una orden en estado ${this._estado.getValue()}`
      );
    }

    if (!this._tecnicoAsignadoId) {
      throw new Error('Debe asignar un técnico antes de iniciar');
    }

    // Validar que la fecha programada no sea futura (salvo casos urgentes)
    if (this._fechaProgramada && !this._prioridad.esUrgente()) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaProg = new Date(this._fechaProgramada);
      fechaProg.setHours(0, 0, 0, 0);

      if (fechaProg > hoy) {
        throw new Error('No se puede iniciar una orden antes de su fecha programada');
      }
    }

    this._fechaInicio = new Date();
    this._estado = EstadoOrden.enProceso();
    this._updatedAt = new Date();
  }

  /**
   * EN_PROCESO → EJECUTADA
   * Finaliza la ejecución de la orden
   */
  finalizar(observaciones?: string): void {
    if (!this._estado.esEnProceso()) {
      throw new Error(
        `No se puede finalizar una orden en estado ${this._estado.getValue()}`
      );
    }

    if (!this._fechaInicio) {
      throw new Error('Orden sin fecha de inicio');
    }

    this._fechaFin = new Date();
    this._observaciones = observaciones?.trim() || this._observaciones;
    this._estado = EstadoOrden.ejecutada();
    this._updatedAt = new Date();
  }

  /**
   * EJECUTADA → EN_REVISION
   * Envía la orden a revisión
   */
  enviarARevision(): void {
    if (!this._estado.esEjecutada()) {
      throw new Error(
        `No se puede enviar a revisión una orden en estado ${this._estado.getValue()}`
      );
    }

    if (!this._fechaFin) {
      throw new Error('Orden sin fecha de fin');
    }

    this._estado = EstadoOrden.enRevision();
    this._updatedAt = new Date();
  }

  /**
   * EN_REVISION → APROBADA
   * Aprueba la orden (requiere firma del cliente)
   */
  aprobar(firmaClienteUrl: string): void {
    if (!this._estado.esEnRevision()) {
      throw new Error(
        `No se puede aprobar una orden en estado ${this._estado.getValue()}`
      );
    }

    if (!firmaClienteUrl?.trim()) {
      throw new Error('Firma del cliente es requerida para aprobar');
    }

    this._firmaClienteUrl = firmaClienteUrl.trim();
    this._estado = EstadoOrden.aprobada();
    this._updatedAt = new Date();
  }

  /**
   * EN_REVISION → EN_PROCESO (rechazo - requiere corrección)
   */
  rechazarYReejecutar(observaciones: string): void {
    if (!this._estado.esEnRevision()) {
      throw new Error(
        `No se puede rechazar una orden en estado ${this._estado.getValue()}`
      );
    }

    if (!observaciones?.trim()) {
      throw new Error('Observaciones son requeridas al rechazar');
    }

    this._observaciones = observaciones.trim();
    this._fechaFin = null; // Resetear fecha fin
    this._estado = EstadoOrden.enProceso();
    this._updatedAt = new Date();
  }

  // ==================== MÉTODOS DE ACTUALIZACIÓN ====================

  /**
   * Actualiza la descripción de la orden (solo en estados modificables)
   */
  actualizarDescripcion(descripcion: string): void {
    if (!this._estado.puedeSerModificada()) {
      throw new Error(
        `No se puede modificar descripción en estado ${this._estado.getValue()}`
      );
    }

    this._descripcion = descripcion.trim();
    this._updatedAt = new Date();
  }

  /**
   * Actualiza la prioridad de la orden (solo en estados iniciales)
   */
  actualizarPrioridad(prioridad: PrioridadOrdenEnum): void {
    if (!this._estado.puedeSerModificada()) {
      throw new Error(
        `No se puede cambiar prioridad en estado ${this._estado.getValue()}`
      );
    }

    this._prioridad = PrioridadOrden.from(prioridad);
    this._updatedAt = new Date();
  }

  // ==================== GETTERS ====================

  get id(): OrdenServicioId {
    return this._id;
  }

  get numeroOrden(): NumeroOrden {
    return this._numeroOrden;
  }

  get estado(): EstadoOrden {
    return this._estado;
  }

  get prioridad(): PrioridadOrden {
    return this._prioridad;
  }

  get equipoId(): number {
    return this._equipoId;
  }

  get clienteId(): number {
    return this._clienteId;
  }

  get sedeClienteId(): number | null {
    return this._sedeClienteId;
  }

  get tipoServicioId(): number {
    return this._tipoServicioId;
  }

  get descripcion(): string | null {
    return this._descripcion;
  }

  get fechaProgramada(): Date | null {
    return this._fechaProgramada;
  }

  get tecnicoAsignadoId(): number | null {
    return this._tecnicoAsignadoId;
  }

  get fechaInicio(): Date | null {
    return this._fechaInicio;
  }

  get fechaFin(): Date | null {
    return this._fechaFin;
  }

  get observaciones(): string | null {
    return this._observaciones;
  }

  get firmaClienteUrl(): string | null {
    return this._firmaClienteUrl;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date | null {
    return this._updatedAt;
  }

  /**
   * Serializa la entidad a objeto plano
   */
  toObject() {
    return {
      id: this._id.getValue(),
      numeroOrden: this._numeroOrden.getValue(),
      estado: this._estado.getValue(),
      prioridad: this._prioridad.getValue(),
      equipoId: this._equipoId,
      clienteId: this._clienteId,
      sedeClienteId: this._sedeClienteId,
      tipoServicioId: this._tipoServicioId,
      descripcion: this._descripcion,
      fechaProgramada: this._fechaProgramada,
      tecnicoAsignadoId: this._tecnicoAsignadoId,
      fechaInicio: this._fechaInicio,
      fechaFin: this._fechaFin,
      observaciones: this._observaciones,
      firmaClienteUrl: this._firmaClienteUrl,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      userId: this._userId,
    };
  }
}
