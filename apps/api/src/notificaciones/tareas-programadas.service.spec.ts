import { TareasProgramadasService } from './tareas-programadas.service';

describe('TareasProgramadasService (Gate F2)', () => {
  it('onModuleInit sincroniza la zona horaria IANA de los CRON jobs desde ConfiguracionOrganizacionService', async () => {
    const fakeSetTime = jest.fn();
    class FakeCronTime {
      constructor(
        public readonly source: string,
        public readonly timeZone: string,
      ) {}
    }

    const fakeJob = {
      cronTime: new FakeCronTime('0 8 * * *', 'America/Bogota'),
      setTime: fakeSetTime,
    };

    const mockSchedulerRegistry = {
      getCronJob: jest.fn().mockReturnValue(fakeJob),
    };
    const mockConfigOrgService = {
      getContext: jest.fn().mockResolvedValue({ zona_horaria: 'America/Mexico_City' }),
    };

    const service = new TareasProgramadasService(
      {} as any,
      {} as any,
      undefined,
      mockConfigOrgService as any,
      mockSchedulerRegistry as any,
    );

    await service.onModuleInit();

    expect(mockSchedulerRegistry.getCronJob).toHaveBeenCalledTimes(6);
    expect(fakeSetTime).toHaveBeenCalledTimes(6);
    const updatedCronTime = fakeSetTime.mock.calls[0][0];
    expect(updatedCronTime.timeZone).toBe('America/Mexico_City');
    expect(updatedCronTime.source).toBe('0 8 * * *');
  });

  it('Job 3 (alertarContratosPorVencer) resuelve empleado -> id_persona -> usuario activo y notifica sin confundir IDs', async () => {
    const fechaFin = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const mockPrisma: any = {
      contratos_mantenimiento: {
        findMany: jest.fn().mockResolvedValue([
          {
            id_contrato: 10,
            codigo_contrato: 'CTR-2026-001',
            id_asesor_responsable: 77,
            fecha_fin: fechaFin,
            clientes: {
              persona: { razon_social: 'Industria Alpha S.A.S.', nombre_completo: null },
            },
            empleados: { id_empleado: 77, id_persona: 501 },
          },
          {
            id_contrato: 11,
            codigo_contrato: 'CTR-2026-002',
            id_asesor_responsable: 88,
            fecha_fin: fechaFin,
            clientes: {
              persona: { razon_social: 'Cliente Sin Usuario', nombre_completo: null },
            },
            empleados: { id_empleado: 88, id_persona: 999 },
          },
        ]),
      },
      usuarios: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id_usuario: 3001 })
          .mockResolvedValueOnce(null),
      },
      notificaciones: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const mockNotificaciones = {
      notificarContratoPorVencer: jest.fn().mockResolvedValue({ success: true }),
    };

    const service = new TareasProgramadasService(
      mockPrisma,
      mockNotificaciones as any,
    );

    await service.alertarContratosPorVencer();

    expect(mockPrisma.usuarios.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id_persona: 501, estado: 'ACTIVO' },
      select: { id_usuario: true },
    });
    expect(mockNotificaciones.notificarContratoPorVencer).toHaveBeenCalledTimes(1);
    expect(mockNotificaciones.notificarContratoPorVencer).toHaveBeenCalledWith(
      3001,
      'CTR-2026-001',
      10,
      'Industria Alpha S.A.S.',
      expect.any(Number),
    );
  });

  it('Job 4 (generarOrdenesDesdeCronogramas) delega al ProgramacionFacadeService inyectado por DI', async () => {
    const mockProgramacionFacade = {
      generarOrdenesDesdeCronogramas: jest.fn().mockResolvedValue({
        success: true,
        data: { ordenesCreadas: 3 },
      }),
    };

    const service = new TareasProgramadasService(
      {} as any,
      {} as any,
      mockProgramacionFacade as any,
    );

    await expect(service.generarOrdenesDesdeCronogramas()).resolves.toBeUndefined();
    expect(mockProgramacionFacade.generarOrdenesDesdeCronogramas).toHaveBeenCalledWith(7);
  });
});
