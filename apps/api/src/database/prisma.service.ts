/**
 * PrismaService - Servicio inyectable de NestJS para Prisma Client
 *
 * NOTA (rendimiento/conexiones):
 * Antes esta clase era una SEGUNDA implementación de PrismaService, distinta de
 * la de `@mekanos/database`. Eso hacía que el proceso abriera dos pools de
 * conexiones independientes contra Supabase y agotara el límite del pooler en
 * modo sesión (15 clientes), provocando:
 *   FATAL: (EMAXCONNSESSION) max clients reached in session mode
 *
 * Ahora simplemente re-exportamos la única implementación del monorepo, que
 * además es singleton a nivel de proceso. Cualquier módulo que inyecte
 * `PrismaService` desde `../database/prisma.service` o desde
 * `@mekanos/database` obtiene la MISMA instancia y el MISMO pool.
 */

export { PrismaService } from '@mekanos/database';
