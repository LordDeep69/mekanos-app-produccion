import {
  formatCorrelativeCode,
  reserveNextSequenceCounter,
} from './sequence-counter.helper';

describe('sequence-counter.helper (Gate F2)', () => {
  it('formatea códigos correlativos con padding configurable', () => {
    expect(formatCorrelativeCode('COT', 2026, 7)).toBe('COT-2026-0007');
    expect(formatCorrelativeCode('REM', 2026, 42, 5)).toBe('REM-2026-00042');
  });

  it('usa pg_advisory_xact_lock + FOR UPDATE cuando el cliente expone $executeRaw/$queryRaw', async () => {
    const mockTx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([{ id: 12, current_value: 9 }]),
      sequence_counter: {
        update: jest.fn().mockResolvedValue({ id: 12, current_value: 10 }),
        create: jest.fn(),
      },
    };
    const mockPrisma = {
      $transaction: jest.fn(async (cb: (tx: typeof mockTx) => Promise<any>) => cb(mockTx)),
    };

    const res = await reserveNextSequenceCounter(mockPrisma, 'OC', 2026);

    expect(res).toEqual({ id: 12, sequence: 10, year: 2026 });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mockTx.sequence_counter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 12 },
        data: expect.objectContaining({ current_value: 10 }),
      }),
    );
    expect(mockTx.sequence_counter.create).not.toHaveBeenCalled();
  });

  it('inicializa secuencia respetando seedMinValue cuando no existe registro previo', async () => {
    const mockTx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([]),
      sequence_counter: {
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 55, current_value: 26 }),
      },
    };

    const res = await reserveNextSequenceCounter(
      mockTx,
      'OS_MES',
      202611,
      async () => 25,
    );

    expect(res).toEqual({ id: 55, sequence: 26, year: 202611 });
    expect(mockTx.sequence_counter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'OS_MES',
          year: 202611,
          current_value: 26,
        }),
      }),
    );
  });

  it('respalda atomicidad con fallback findFirst+update/create para mocks unitarios', async () => {
    const mockPrisma = {
      sequence_counter: {
        findFirst: jest.fn().mockResolvedValue({ id: 3, current_value: 4 }),
        update: jest.fn().mockResolvedValue({ id: 3, current_value: 5 }),
        create: jest.fn(),
      },
    };

    const res = await reserveNextSequenceCounter(mockPrisma, 'REC', 2026);

    expect(res).toEqual({ id: 3, sequence: 5, year: 2026 });
    expect(mockPrisma.sequence_counter.findFirst).toHaveBeenCalledWith({
      where: { type: 'REC', year: 2026 },
      orderBy: { id: 'asc' },
    });
  });
});
