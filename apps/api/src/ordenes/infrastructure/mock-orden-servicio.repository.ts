import { Injectable } from '@nestjs/common';
import {
  IOrdenServicioRepository,
  FindOrdenesFilters,
  OrdenServicioEntity,
  OrdenServicioId,
  EstadoOrden,
  EstadoOrdenEnum,
  PrioridadOrdenEnum
} from '@mekanos/core';

/**
 * MockOrdenServicioRepository
 * Implementación en memoria para desarrollo/testing
 * 
 * Contiene 10 órdenes mock representando todos los estados del workflow
 */
@Injectable()
export class MockOrdenServicioRepository implements IOrdenServicioRepository {
  private ordenes: Map<string, OrdenServicioEntity> = new Map();

  constructor() {
    this.seedMockData();
  }

  /**
   * Seed 10 órdenes mock con diferentes estados
   */
  private seedMockData(): void {
    const now = new Date();
    const mockOrdenes: any[] = [
      // 2 BORRADOR (creadas, sin programar)
      {
        id: 'OS-202411-00000001-0000-0000-0000-000000000001',
        numeroOrden: 'OS-202411-0001',
        estado: EstadoOrdenEnum.BORRADOR,
        prioridad: PrioridadOrdenEnum.MEDIA,
        equipoId: 1,
        clienteId: 1,
        sedeClienteId: 1,
        tipoServicioId: 1,
        descripcion: 'Mantenimiento preventivo - Pendiente de programación',
        fechaProgramada: null,
        tecnicoAsignadoId: null,
        fechaInicio: null,
        fechaFin: null,
        observaciones: null,
        firmaClienteUrl: null,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Hace 2 días
        updatedAt: null
      },
      {
        id: 'OS-202411-00000002-0000-0000-0000-000000000002',
        numeroOrden: 'OS-202411-0002',
        estado: EstadoOrdenEnum.BORRADOR,
        prioridad: PrioridadOrdenEnum.ALTA,
        equipoId: 2,
        clienteId: 1,
        sedeClienteId: 1,
        tipoServicioId: 2,
        descripcion: 'Reparación de generador - Alta prioridad',
        fechaProgramada: null,
        tecnicoAsignadoId: null,
        fechaInicio: null,
        fechaFin: null,
        observaciones: null,
        firmaClienteUrl: null,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Hace 1 día
        updatedAt: null
      },

      // 2 PROGRAMADA (fecha asignada, sin técnico)
      {
        id: 'OS-202411-00000003-0000-0000-0000-000000000003',
        numeroOrden: 'OS-202411-0003',
        estado: EstadoOrdenEnum.PROGRAMADA,
        prioridad: PrioridadOrdenEnum.MEDIA,
        equipoId: 3,
        clienteId: 2,
        sedeClienteId: 2,
        tipoServicioId: 1,
        descripcion: 'Inspección rutinaria bomba centrífuga',
        fechaProgramada: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // En 3 días
        tecnicoAsignadoId: null,
        fechaInicio: null,
        fechaFin: null,
        observaciones: 'Programada para próxima semana',
        firmaClienteUrl: null,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'OS-202411-00000004-0000-0000-0000-000000000004',
        numeroOrden: 'OS-202411-0004',
        estado: EstadoOrdenEnum.PROGRAMADA,
        prioridad: PrioridadOrdenEnum.URGENTE,
        equipoId: 4,
        clienteId: 2,
        sedeClienteId: 3,
        tipoServicioId: 3,
        descripcion: 'Falla crítica en motor principal',
        fechaProgramada: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Mañana
        tecnicoAsignadoId: null,
        fechaInicio: null,
        fechaFin: null,
        observaciones: 'Requiere atención inmediata',
        firmaClienteUrl: null,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000)
      },

      // 2 ASIGNADA (técnico asignado, aún no iniciada)
      {
        id: 'OS-202411-00000005-0000-0000-0000-000000000005',
        numeroOrden: 'OS-202411-0005',
        estado: EstadoOrdenEnum.ASIGNADA,
        prioridad: PrioridadOrdenEnum.MEDIA,
        equipoId: 5,
        clienteId: 3,
        sedeClienteId: 4,
        tipoServicioId: 1,
        descripcion: 'Mantenimiento correctivo sistema eléctrico',
        fechaProgramada: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        tecnicoAsignadoId: 1, // Técnico Juan Pérez
        fechaInicio: null,
        fechaFin: null,
        observaciones: 'Técnico Juan asignado',
        firmaClienteUrl: null,
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'OS-202411-00000006-0000-0000-0000-000000000006',
        numeroOrden: 'OS-202411-0006',
        estado: EstadoOrdenEnum.ASIGNADA,
        prioridad: PrioridadOrdenEnum.ALTA,
        equipoId: 6,
        clienteId: 3,
        sedeClienteId: 5,
        tipoServicioId: 2,
        descripcion: 'Cambio de rodamientos en motor',
        fechaProgramada: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        tecnicoAsignadoId: 2, // Técnico María García
        fechaInicio: null,
        fechaFin: null,
        observaciones: 'María confirmó disponibilidad',
        firmaClienteUrl: null,
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      },

      // 2 EN_PROCESO (en ejecución ahora)
      {
        id: 'OS-202411-00000007-0000-0000-0000-000000000007',
        numeroOrden: 'OS-202411-0007',
        estado: EstadoOrdenEnum.EN_PROCESO,
        prioridad: PrioridadOrdenEnum.MEDIA,
        equipoId: 7,
        clienteId: 4,
        sedeClienteId: 6,
        tipoServicioId: 1,
        descripcion: 'Limpieza y lubricación generador',
        fechaProgramada: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        tecnicoAsignadoId: 1,
        fechaInicio: new Date(now.getTime() - 3 * 60 * 60 * 1000), // Hace 3 horas
        fechaFin: null,
        observaciones: 'Trabajo en progreso',
        firmaClienteUrl: null,
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000)
      },
      {
        id: 'OS-202411-00000008-0000-0000-0000-000000000008',
        numeroOrden: 'OS-202411-0008',
        estado: EstadoOrdenEnum.EN_PROCESO,
        prioridad: PrioridadOrdenEnum.ALTA,
        equipoId: 8,
        clienteId: 4,
        sedeClienteId: 7,
        tipoServicioId: 3,
        descripcion: 'Reparación bomba hidráulica',
        fechaProgramada: now,
        tecnicoAsignadoId: 2,
        fechaInicio: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Hace 2 horas
        fechaFin: null,
        observaciones: 'Piezas de repuesto aplicadas',
        firmaClienteUrl: null,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
      },

      // 1 EJECUTADA (finalizada, pendiente revisión)
      {
        id: 'OS-202411-00000009-0000-0000-0000-000000000009',
        numeroOrden: 'OS-202411-0009',
        estado: EstadoOrdenEnum.EJECUTADA,
        prioridad: PrioridadOrdenEnum.MEDIA,
        equipoId: 9,
        clienteId: 5,
        sedeClienteId: 8,
        tipoServicioId: 1,
        descripcion: 'Calibración instrumentos motor diesel',
        fechaProgramada: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        tecnicoAsignadoId: 1,
        fechaInicio: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        fechaFin: new Date(now.getTime() - 6 * 60 * 60 * 1000), // Hace 6 horas
        observaciones: 'Calibración completada exitosamente',
        firmaClienteUrl: null,
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000)
      },

      // 1 APROBADA (completamente finalizada)
      {
        id: 'OS-202411-00000010-0000-0000-0000-000000000010',
        numeroOrden: 'OS-202411-0010',
        estado: EstadoOrdenEnum.APROBADA,
        prioridad: PrioridadOrdenEnum.BAJA,
        equipoId: 10,
        clienteId: 5,
        sedeClienteId: 9,
        tipoServicioId: 1,
        descripcion: 'Inspección anual equipo auxiliar',
        fechaProgramada: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        tecnicoAsignadoId: 2,
        fechaInicio: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        fechaFin: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        observaciones: 'Inspección completa, equipo en óptimas condiciones',
        firmaClienteUrl: 'https://mekanos-signatures.s3.amazonaws.com/cliente-5-firma.png',
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      }
    ];

    // Hidratar órdenes desde mock data
    mockOrdenes.forEach(data => {
      const orden = OrdenServicioEntity.fromPersistence(data);
      this.ordenes.set(data.id, orden);
    });

    console.log(`✅ MockOrdenServicioRepository seeded with ${this.ordenes.size} ordenes`);
  }

  async findById(id: OrdenServicioId): Promise<OrdenServicioEntity | null> {
    return this.ordenes.get(id.getValue()) || null;
  }

  async findByNumeroOrden(numeroOrden: string): Promise<OrdenServicioEntity | null> {
    const found = Array.from(this.ordenes.values()).find(
      o => o.numeroOrden.getValue() === numeroOrden
    );
    return found || null;
  }

  async findAll(filters?: FindOrdenesFilters): Promise<OrdenServicioEntity[]> {
    let result = Array.from(this.ordenes.values());

    // Aplicar filtros
    if (filters) {
      if (filters.clienteId) {
        result = result.filter(o => o.clienteId === filters.clienteId);
      }
      if (filters.equipoId) {
        result = result.filter(o => o.equipoId === filters.equipoId);
      }
      if (filters.sedeClienteId) {
        result = result.filter(o => o.sedeClienteId === filters.sedeClienteId);
      }
      if (filters.tecnicoAsignadoId) {
        result = result.filter(o => o.tecnicoAsignadoId === filters.tecnicoAsignadoId);
      }
      if (filters.estado) {
        result = result.filter(o => o.estado.getValue() === filters.estado);
      }
      if (filters.prioridad) {
        result = result.filter(o => o.prioridad.getValue() === filters.prioridad);
      }
      if (filters.fechaDesde) {
        result = result.filter(o => o.createdAt >= filters.fechaDesde!);
      }
      if (filters.fechaHasta) {
        result = result.filter(o => o.createdAt <= filters.fechaHasta!);
      }

      // Paginación
      if (filters.skip !== undefined && filters.take !== undefined) {
        result = result.slice(filters.skip, filters.skip + filters.take);
      }
    }

    return result;
  }

  async findByEquipo(equipoId: number): Promise<OrdenServicioEntity[]> {
    return Array.from(this.ordenes.values()).filter(o => o.equipoId === equipoId);
  }

  async findByCliente(clienteId: number): Promise<OrdenServicioEntity[]> {
    return Array.from(this.ordenes.values()).filter(o => o.clienteId === clienteId);
  }

  async findByTecnico(tecnicoId: number): Promise<OrdenServicioEntity[]> {
    return Array.from(this.ordenes.values()).filter(
      o => o.tecnicoAsignadoId === tecnicoId
    );
  }

  async findByEstado(estado: EstadoOrden): Promise<OrdenServicioEntity[]> {
    return Array.from(this.ordenes.values()).filter(
      o => o.estado.getValue() === estado.getValue()
    );
  }

  async count(filters?: FindOrdenesFilters): Promise<number> {
    const all = await this.findAll(filters);
    return all.length;
  }

  async save(orden: OrdenServicioEntity): Promise<OrdenServicioEntity> {
    this.ordenes.set(orden.id.getValue(), orden);
    return orden;
  }

  async delete(id: OrdenServicioId): Promise<void> {
    this.ordenes.delete(id.getValue());
  }

  async existsByNumeroOrden(numeroOrden: string): Promise<boolean> {
    const found = await this.findByNumeroOrden(numeroOrden);
    return found !== null;
  }

  async getUltimoCorrelativoMes(): Promise<number> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const prefix = `OS-${currentYear}${String(currentMonth).padStart(2, '0')}`;

    const ordenesDelMes = Array.from(this.ordenes.values())
      .filter(o => o.numeroOrden.getValue().startsWith(prefix))
      .map(o => o.numeroOrden.getCorrelativo());

    return ordenesDelMes.length > 0 ? Math.max(...ordenesDelMes) : 0;
  }
}
