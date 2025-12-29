/**
 * MEKANOS S.A.S - Portal Admin
 * Tipos TypeScript - Index
 * 
 * Exporta todos los tipos e interfaces
 */

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode?: number;
}

export interface ApiError {
  message: string;
  error?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Próximamente: Orden, Cliente, Empleado, etc.
