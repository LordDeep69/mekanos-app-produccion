/**
 * Obtiene de forma segura el siguiente entero PK para tablas heredadas sin SERIAL/IDENTITY.
 * Soporta tanto PrismaService como Prisma.TransactionClient.
 */
export async function getNextTableId(
  prismaClient: { $queryRawUnsafe: <T = unknown>(query: string) => Promise<T> },
  tableName: string,
  pkColumn: string,
): Promise<number> {
  const rows = await prismaClient.$queryRawUnsafe<
    Array<{ next_id: number | bigint | string | null }>
  >(`SELECT COALESCE(MAX("${pkColumn}"), 0) + 1 AS next_id FROM "${tableName}"`);
  return Number(rows?.[0]?.next_id ?? 1);
}
