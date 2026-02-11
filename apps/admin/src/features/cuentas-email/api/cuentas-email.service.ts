import { apiClient } from '@/lib/api/client';

export interface CuentaEmail {
  id_cuenta_email: number;
  nombre: string;
  email: string;
  es_principal: boolean;
  activa: boolean;
  credenciales_configuradas: boolean;
  fecha_creacion: string;
  usuario_creador?: {
    id_usuario: number;
    username: string;
  };
}

export interface CuentaEmailSelector {
  id_cuenta_email: number;
  nombre: string;
  email: string;
  es_principal: boolean;
}

export interface CreateCuentaEmailDto {
  nombre: string;
  email: string;
  gmail_client_id: string;
  gmail_client_secret: string;
  gmail_refresh_token: string;
  es_principal?: boolean;
  activa?: boolean;
}

export interface UpdateCuentaEmailDto extends Partial<CreateCuentaEmailDto> {}

export interface TestConexionResult {
  success: boolean;
  message: string;
}

// Obtener todas las cuentas de email
export const getCuentasEmail = async (): Promise<CuentaEmail[]> => {
  const response = await apiClient.get('/cuentas-email');
  return response.data;
};

// Obtener cuentas para selector (sin credenciales)
export const getCuentasEmailSelector = async (): Promise<CuentaEmailSelector[]> => {
  const response = await apiClient.get('/cuentas-email/selector');
  return response.data;
};

// Obtener una cuenta por ID
export const getCuentaEmail = async (id: number): Promise<CuentaEmail> => {
  const response = await apiClient.get(`/cuentas-email/${id}`);
  return response.data;
};

// Crear nueva cuenta de email
export const createCuentaEmail = async (data: CreateCuentaEmailDto): Promise<CuentaEmail> => {
  const response = await apiClient.post('/cuentas-email', data);
  return response.data;
};

// Actualizar cuenta de email
export const updateCuentaEmail = async (id: number, data: UpdateCuentaEmailDto): Promise<CuentaEmail> => {
  const response = await apiClient.patch(`/cuentas-email/${id}`, data);
  return response.data;
};

// Eliminar cuenta de email
export const deleteCuentaEmail = async (id: number): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/cuentas-email/${id}`);
  return response.data;
};

// Probar conexión de una cuenta
export const testCuentaEmail = async (id: number): Promise<TestConexionResult> => {
  const response = await apiClient.post(`/cuentas-email/${id}/test`);
  return response.data;
};
