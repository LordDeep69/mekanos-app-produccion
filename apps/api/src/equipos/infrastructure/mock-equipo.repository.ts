import { Injectable } from '@nestjs/common';
import { IEquipoRepository, FindEquiposFilters, EquipoEntity, EquipoId } from '@mekanos/core';

/**
 * Mock repository para desarrollo sin base de datos
 * Simula 5 equipos de diferentes tipos y clientes
 */
@Injectable()
export class MockEquipoRepository implements IEquipoRepository {
  private equipos: EquipoEntity[] = [];
  private idCounter = 1;

  constructor() {
    this.seedMockData();
  }

  private seedMockData(): void {
    // Equipo 1: Generador Cummins - Cliente ACME Corp
    this.equipos.push(
      EquipoEntity.fromPersistence({
        id: this.idCounter++,
        codigo: 'GEN-2024-0001',
        marca: 'CUMMINS',
        modelo: 'C550D5',
        serie: 'CU202401001',
        clienteId: 1,
        sedeId: 1,
        tipoEquipoId: 1,
        nombreEquipo: 'Generador Principal Planta Norte',
        estado: 'OPERATIVO',
        fechaRegistro: new Date('2024-01-15'),
        ultimoMantenimiento: new Date('2024-11-01')
      })
    );

    // Equipo 2: Bomba Grundfos - Cliente ACME Corp
    this.equipos.push(
      EquipoEntity.fromPersistence({
        id: this.idCounter++,
        codigo: 'BOM-2024-0001',
        marca: 'GRUNDFOS',
        modelo: 'CR64-3-1',
        serie: 'GR202402001',
        clienteId: 1,
        sedeId: 1,
        tipoEquipoId: 3,
        nombreEquipo: 'Bomba Sistema Contra Incendios',
        estado: 'EN_REPARACION',
        fechaRegistro: new Date('2024-02-20'),
        ultimoMantenimiento: new Date('2024-10-15')
      })
    );

    // Equipo 3: Motor Caterpillar - Cliente TechSolutions
    this.equipos.push(
      EquipoEntity.fromPersistence({
        id: this.idCounter++,
        codigo: 'MOT-2024-0001',
        marca: 'CATERPILLAR',
        modelo: '3508-DITA',
        serie: 'CAT202403001',
        clienteId: 2,
        sedeId: 3,
        tipoEquipoId: 2,
        nombreEquipo: 'Motor Compresor Industrial',
        estado: 'OPERATIVO',
        fechaRegistro: new Date('2024-03-10'),
        ultimoMantenimiento: new Date('2024-11-05')
      })
    );

    // Equipo 4: Generador Perkins - Cliente ACME Corp (Sede Sur)
    this.equipos.push(
      EquipoEntity.fromPersistence({
        id: this.idCounter++,
        codigo: 'GEN-2024-0002',
        marca: 'PERKINS',
        modelo: '2506A-E15TAG2',
        serie: 'PK202404001',
        clienteId: 1,
        sedeId: 2,
        tipoEquipoId: 1,
        nombreEquipo: 'Generador Respaldo Planta Sur',
        estado: 'STANDBY',
        fechaRegistro: new Date('2024-04-05'),
        ultimoMantenimiento: new Date('2024-09-20')
      })
    );

    // Equipo 5: Bomba KSB - Cliente GlobalEnterprises (sede inactiva)
    this.equipos.push(
      EquipoEntity.fromPersistence({
        id: this.idCounter++,
        codigo: 'BOM-2024-0002',
        marca: 'KSB',
        modelo: 'ETANORM-G-125-250',
        serie: 'KS202405001',
        clienteId: 3,
        sedeId: undefined,
        tipoEquipoId: 3,
        nombreEquipo: 'Bomba Proceso Químico',
        estado: 'INACTIVO',
        fechaRegistro: new Date('2024-05-12'),
        ultimoMantenimiento: undefined
      })
    );
  }

  async save(equipo: EquipoEntity): Promise<EquipoEntity> {
    const index = this.equipos.findIndex(
      (e) => e.id.getValue() === equipo.id.getValue()
    );

    if (index !== -1) {
      // Actualizar existente
      this.equipos[index] = equipo;
      return equipo;
    }

    // Crear nuevo (asignar ID)
    const equipoData = equipo.toObject();
    const nuevoEquipo = EquipoEntity.fromPersistence({
      ...equipoData,
      id: this.idCounter++,
      serie: equipoData.serie || undefined,
      sedeId: equipoData.sedeId || undefined,
      nombreEquipo: equipoData.nombreEquipo || undefined,
      ultimoMantenimiento: equipoData.ultimoMantenimiento || undefined
    });
    this.equipos.push(nuevoEquipo);
    return nuevoEquipo;
  }

  async findById(id: EquipoId): Promise<EquipoEntity | null> {
    const equipo = this.equipos.find((e) => e.id.equals(id));
    return equipo || null;
  }

  async findByCodigo(codigo: string): Promise<EquipoEntity | null> {
    const codigoUpper = codigo.toUpperCase();
    const equipo = this.equipos.find(
      (e) => e.codigo.getValue() === codigoUpper
    );
    return equipo || null;
  }

  async findAll(filters?: FindEquiposFilters): Promise<EquipoEntity[]> {
    let resultado = [...this.equipos];

    // Aplicar filtros
    if (filters?.clienteId) {
      resultado = resultado.filter((e) => e.clienteId === filters.clienteId);
    }

    if (filters?.sedeId) {
      resultado = resultado.filter((e) => e.sedeId === filters.sedeId);
    }

    if (filters?.estado) {
      resultado = resultado.filter(
        (e) => e.estado.getValue() === filters.estado
      );
    }

    if (filters?.tipoEquipoId) {
      resultado = resultado.filter((e) => e.tipoEquipoId === filters.tipoEquipoId);
    }

    // Aplicar paginación
    if (filters?.skip !== undefined && filters?.take !== undefined) {
      resultado = resultado.slice(filters.skip, filters.skip + filters.take);
    }

    return resultado;
  }

  async count(filters?: FindEquiposFilters): Promise<number> {
    let resultado = [...this.equipos];

    // Aplicar mismos filtros que findAll
    if (filters?.clienteId) {
      resultado = resultado.filter((e) => e.clienteId === filters.clienteId);
    }

    if (filters?.sedeId) {
      resultado = resultado.filter((e) => e.sedeId === filters.sedeId);
    }

    if (filters?.estado) {
      resultado = resultado.filter(
        (e) => e.estado.getValue() === filters.estado
      );
    }

    if (filters?.tipoEquipoId) {
      resultado = resultado.filter((e) => e.tipoEquipoId === filters.tipoEquipoId);
    }

    return resultado.length;
  }

  async existsByCodigo(codigo: string): Promise<boolean> {
    const equipo = await this.findByCodigo(codigo);
    return equipo !== null;
  }

  async delete(id: EquipoId): Promise<void> {
    const index = this.equipos.findIndex((e) => e.id.equals(id));
    if (index !== -1) {
      this.equipos.splice(index, 1);
    }
  }
}
