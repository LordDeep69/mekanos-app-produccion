/**
 * Shared TypeScript types
 */

export type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;
