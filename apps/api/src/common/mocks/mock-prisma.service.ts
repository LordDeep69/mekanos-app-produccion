import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Mock PrismaService para desarrollo sin conexión a BD real
 * Simula las operaciones principales de Prisma con datos en memoria
 */
@Injectable()
export class MockPrismaService {
  // Usuario mock para testing
  private readonly MOCK_USERS = [
    {
      id: 1,
      email: 'admin@mekanos.com',
      passwordHash: bcrypt.hashSync('Admin123!', 10),
      activo: true,
      rol: 'ADMIN' as const,
      fechaCreacion: new Date('2024-01-01'),
      ultimaActualizacion: new Date('2024-01-01'),
      personaId: 1,
      persona: {
        id: 1,
        nombre: 'Admin',
        apellido: 'Mekanos',
        tipoDocumento: 'CC' as const,
        numeroDocumento: '1234567890',
        telefono: '+57 300 123 4567',
        email: 'admin@mekanos.com',
        activo: true,
        fechaCreacion: new Date('2024-01-01'),
        ultimaActualizacion: new Date('2024-01-01'),
      },
    },
    {
      id: 2,
      email: 'tecnico@mekanos.com',
      passwordHash: bcrypt.hashSync('Tecnico123!', 10),
      activo: true,
      rol: 'TECNICO' as const,
      fechaCreacion: new Date('2024-01-01'),
      ultimaActualizacion: new Date('2024-01-01'),
      personaId: 2,
      persona: {
        id: 2,
        nombre: 'Juan',
        apellido: 'Pérez',
        tipoDocumento: 'CC' as const,
        numeroDocumento: '9876543210',
        telefono: '+57 301 987 6543',
        email: 'tecnico@mekanos.com',
        activo: true,
        fechaCreacion: new Date('2024-01-01'),
        ultimaActualizacion: new Date('2024-01-01'),
      },
    },
    {
      id: 3,
      email: 'cliente@empresa.com',
      passwordHash: bcrypt.hashSync('Cliente123!', 10),
      activo: true,
      rol: 'CLIENTE' as const,
      fechaCreacion: new Date('2024-01-01'),
      ultimaActualizacion: new Date('2024-01-01'),
      personaId: 3,
      persona: {
        id: 3,
        nombre: 'María',
        apellido: 'González',
        tipoDocumento: 'CC' as const,
        numeroDocumento: '5555555555',
        telefono: '+57 302 555 5555',
        email: 'cliente@empresa.com',
        activo: true,
        fechaCreacion: new Date('2024-01-01'),
        ultimaActualizacion: new Date('2024-01-01'),
      },
    },
  ];

  /**
   * Mock de la operación usuarios.findUnique
   */
  public usuarios = {
    findUnique: async ({ where }: { where: { email?: string; id?: number } }) => {
      if (where.email) {
        return this.MOCK_USERS.find((u) => u.email === where.email) || null;
      }
      if (where.id) {
        return this.MOCK_USERS.find((u) => u.id === where.id) || null;
      }
      return null;
    },

    findFirst: async ({ where }: { where: { email?: string } }) => {
      if (where.email) {
        return this.MOCK_USERS.find((u) => u.email === where.email) || null;
      }
      return null;
    },

    findMany: async () => {
      return this.MOCK_USERS;
    },

    create: async ({ data }: { data: any }) => {
      const newUser = {
        id: this.MOCK_USERS.length + 1,
        ...data,
        activo: true,
        fechaCreacion: new Date(),
        ultimaActualizacion: new Date(),
      };
      this.MOCK_USERS.push(newUser as any);
      return newUser;
    },

    update: async ({ where, data }: { where: { id: number }; data: any }) => {
      const user = this.MOCK_USERS.find((u) => u.id === where.id);
      if (!user) throw new Error('Usuario no encontrado');
      Object.assign(user, data, { ultimaActualizacion: new Date() });
      return user;
    },
  };

  /**
   * Mock de la operación personas.findUnique
   */
  public personas = {
    findUnique: async ({ where }: { where: { id: number } }) => {
      const user = this.MOCK_USERS.find((u) => u.personaId === where.id);
      return user?.persona || null;
    },

    findMany: async () => {
      return this.MOCK_USERS.map((u) => u.persona);
    },
  };

  /**
   * Mock de $queryRaw para health checks
   */
  public $queryRaw = async (_query: any) => {
    return [{ health_check: 1 }];
  };

  /**
   * Mock de $connect - no hace nada en modo mock
   */
  public async $connect(): Promise<void> {
    console.log('🎭 MockPrismaService: Conexión simulada establecida');
  }

  /**
   * Mock de $disconnect - no hace nada en modo mock
   */
  public async $disconnect(): Promise<void> {
    console.log('🎭 MockPrismaService: Conexión simulada cerrada');
  }

  /**
   * Helper para obtener usuario por email (útil para tests)
   */
  public getMockUserByEmail(email: string) {
    return this.MOCK_USERS.find((u) => u.email === email);
  }

  /**
   * Helper para listar todos los usuarios mock
   */
  public getAllMockUsers() {
    return this.MOCK_USERS;
  }
}
