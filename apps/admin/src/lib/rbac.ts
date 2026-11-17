/**
 * Gobernanza RBAC Zero-Trust compartida entre Edge Middleware y Menú Lateral (apps/admin)
 */

export interface UserRbacClaims {
  rol?: string | null;
  roles?: string[] | null;
  permisos?: string[] | null;
}

const ADMIN_BYPASS_ROLES = new Set(['SUPERADMIN', 'SUPER_ADMIN', 'ADMIN', 'GERENTE']);

export interface RoutePolicy {
  prefix: string;
  roles?: string[];
  permisos?: string[];
}

export const ROUTE_RBAC_POLICIES: RoutePolicy[] = [
  { prefix: '/configuracion/empresa', roles: ['ADMIN', 'SUPERADMIN'], permisos: ['CONFIG_SYSTEM'] },
  { prefix: '/configuracion/cuentas-email', roles: ['ADMIN', 'SUPERADMIN'], permisos: ['CONFIG_SYSTEM'] },
  { prefix: '/configuracion/firmas-administrativas', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE'], permisos: ['CONFIG_SYSTEM', 'EMPLEADOS_READ'] },
  { prefix: '/configuracion/catalogos-eam', roles: ['ADMIN', 'SUPERADMIN', 'SUPERVISOR'], permisos: ['EQUIPOS_CREATE', 'CONFIG_SYSTEM', 'CATALOGO_EAM_WRITE'] },
  { prefix: '/configuracion/catalogos', roles: ['ADMIN', 'SUPERADMIN', 'SUPERVISOR'], permisos: ['CONFIG_SYSTEM', 'ORDENES_ASSIGN'] },
  { prefix: '/configuracion', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'SUPERVISOR'], permisos: ['CONFIG_SYSTEM'] },
  { prefix: '/empleados', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'SUPERVISOR'], permisos: ['EMPLEADOS_READ', 'EMPLEADOS_CREATE'] },
  { prefix: '/compras', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'BODEGA', 'ALMACEN', 'COMPRAS', 'ASESOR'], permisos: ['INVENTARIO_READ', 'COMPRAS_READ'] },
  { prefix: '/inventario/remisiones', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'SUPERVISOR', 'BODEGA', 'ALMACEN'], permisos: ['INVENTARIO_READ', 'REMISIONES_READ'] },
  { prefix: '/inventario', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'SUPERVISOR', 'BODEGA', 'ALMACEN'], permisos: ['INVENTARIO_READ'] },
  { prefix: '/comercial', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'ASESOR', 'ASESOR_COMERCIAL'], permisos: ['COTIZACIONES_READ', 'PROPUESTAS_READ'] },
  { prefix: '/contratos', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'SUPERVISOR', 'ASESOR', 'ASESOR_COMERCIAL'], permisos: ['CONTRATOS_READ', 'ORDENES_READ'] },
  { prefix: '/cronogramas', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'SUPERVISOR'], permisos: ['CRONOGRAMAS_READ', 'ORDENES_READ'] },
  { prefix: '/reportes', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'SUPERVISOR', 'ASESOR'], permisos: ['REPORTES_READ', 'ORDENES_READ'] },
  { prefix: '/clientes', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'SUPERVISOR', 'ASESOR', 'ASESOR_COMERCIAL'], permisos: ['CLIENTES_READ'] },
  { prefix: '/equipos', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'SUPERVISOR', 'ASESOR', 'TECNICO', 'TECNICO_SENIOR'], permisos: ['EQUIPOS_READ'] },
  { prefix: '/agenda', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'SUPERVISOR', 'TECNICO', 'TECNICO_SENIOR'], permisos: ['ORDENES_READ'] },
  { prefix: '/ordenes', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'SUPERVISOR', 'TECNICO', 'TECNICO_SENIOR', 'ASESOR', 'CLIENTE_PORTAL'], permisos: ['ORDENES_READ'] },
  { prefix: '/dashboard', roles: ['ADMIN', 'SUPERADMIN', 'GERENTE', 'SUPERVISOR', 'ASESOR', 'ASESOR_COMERCIAL', 'BODEGA', 'ALMACEN', 'TECNICO', 'TECNICO_SENIOR', 'CLIENTE_PORTAL'] },
];

export function extractNormalizedRoles(claims?: UserRbacClaims | null): string[] {
  const out = new Set<string>();
  if (claims?.rol) out.add(String(claims.rol).toUpperCase().trim());
  for (const r of claims?.roles || []) {
    if (r) out.add(String(r).toUpperCase().trim());
  }
  return Array.from(out);
}

export function extractNormalizedPermisos(claims?: UserRbacClaims | null): string[] {
  return Array.from(
    new Set((claims?.permisos || []).map((p) => String(p).toUpperCase().trim()).filter(Boolean)),
  );
}

export function isAdminUser(claims?: UserRbacClaims | null): boolean {
  return extractNormalizedRoles(claims).some((r) => ADMIN_BYPASS_ROLES.has(r));
}

export function canAccessRoute(pathname: string, claims?: UserRbacClaims | null): boolean {
  if (!claims) return false;
  if (isAdminUser(claims)) return true;

  const roles = extractNormalizedRoles(claims);
  const permisos = extractNormalizedPermisos(claims);
  if (roles.length === 0 && permisos.length === 0) return false;

  const matched = ROUTE_RBAC_POLICIES.find(
    (p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`),
  );
  if (!matched) return true;

  if (matched.permisos && permisos.length > 0) {
    if (matched.permisos.some((req) => permisos.includes(req))) {
      return true;
    }
  }
  if (matched.roles && roles.some((r) => matched.roles!.includes(r))) {
    return true;
  }
  return false;
}
