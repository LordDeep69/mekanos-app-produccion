/**
 * Utilidad atómica y parametrizada para secuencias correlativas (sequence_counter).
 * Elimina el uso de $queryRawUnsafe / $executeRawUnsafe, race conditions en frío
 * y hacks MAX(id)+1 usando pg_advisory_xact_lock + FOR UPDATE + secuencia nativa DB.
 */

export interface SequenceReservation {
  id: number;
  sequence: number;
  year: number;
}

export function formatCorrelativeCode(
  prefix: string,
  year: number,
  sequence: number,
  digits = 4,
): string {
  return `${prefix}-${year}-${String(sequence).padStart(digits, '0')}`;
}

async function runAtomicReservation(
  tx: any,
  type: string,
  targetYear: number,
  seedMinValue = 0,
): Promise<SequenceReservation> {
  const lockKey = `${type}:${targetYear}`;

  if (typeof tx.$executeRaw === 'function' && typeof tx.$queryRaw === 'function') {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
    const rows: Array<{ id: number; current_value: number }> = await tx.$queryRaw`
      SELECT id, current_value
      FROM sequence_counter
      WHERE type = ${type} AND year = ${targetYear}
      ORDER BY id ASC
      LIMIT 1
      FOR UPDATE
    `;

    if (rows && rows.length > 0) {
      const nextVal = Math.max(Number(rows[0].current_value || 0), seedMinValue) + 1;
      await tx.sequence_counter.update({
        where: { id: rows[0].id },
        data: { current_value: nextVal, updated_at: new Date() },
      });
      return { id: rows[0].id, sequence: nextVal, year: targetYear };
    }

    const initialVal = Math.max(0, seedMinValue) + 1;
    const created = await tx.sequence_counter.create({
      data: {
        type,
        year: targetYear,
        current_value: initialVal,
        updated_at: new Date(),
      },
    });
    return { id: created.id, sequence: initialVal, year: targetYear };
  }

  // Fallback para mocks de pruebas unitarias sin $queryRaw/$executeRaw
  const existing = await tx.sequence_counter.findFirst({
    where: { type, year: targetYear },
    orderBy: { id: 'asc' },
  });
  if (existing) {
    const nextVal = Math.max(Number(existing.current_value || 0), seedMinValue) + 1;
    const updated = await tx.sequence_counter.update({
      where: { id: existing.id },
      data: { current_value: nextVal, updated_at: new Date() },
    });
    return { id: updated.id, sequence: nextVal, year: targetYear };
  }

  const initialVal = Math.max(0, seedMinValue) + 1;
  const created = await tx.sequence_counter.create({
    data: {
      type,
      year: targetYear,
      current_value: initialVal,
      updated_at: new Date(),
    },
  });
  return { id: created.id, sequence: initialVal, year: targetYear };
}

export async function reserveNextSequenceCounter(
  txOrPrisma: any,
  type: string,
  year: number = new Date().getFullYear(),
  seedMinValue: number | (() => Promise<number>) = 0,
): Promise<SequenceReservation> {
  const exec = async (tx: any) => {
    const resolvedSeed = typeof seedMinValue === 'function' ? await seedMinValue() : seedMinValue;
    return runAtomicReservation(tx, type, year, resolvedSeed);
  };

  if (typeof txOrPrisma.$transaction === 'function') {
    return txOrPrisma.$transaction(async (tx: any) => exec(tx));
  }
  return exec(txOrPrisma);
}
