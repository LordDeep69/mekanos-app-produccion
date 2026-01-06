import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { ActividadesEjecutadasModule } from './actividades-ejecutadas/actividades.module';
import { AlertasStockModule } from './alertas-stock/alertas-stock.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AprobacionesCotizacionModule } from './aprobaciones-cotizacion/aprobaciones-cotizacion.module';
import { AuthModule } from './auth/auth.module';
import { BitacorasInformesModule } from './bitacoras-informes/bitacoras-informes.module';
import { BitacorasModule } from './bitacoras/bitacoras.module';
import { CatalogoActividadesModule } from './catalogo-actividades/catalogo-actividades.module';
import { CatalogoComponentesModule } from './catalogo-componentes/catalogo-componentes.module';
import { CatalogoServiciosModule } from './catalogo-servicios/catalogo-servicios.module';
import { CatalogoSistemasModule } from './catalogo-sistemas/catalogo-sistemas.module';
import { CertificacionesTecnicasModule } from './certificaciones-tecnicas/certificaciones-tecnicas.module';
import { ClientesModule } from './clientes/clientes.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module'; // ✅ FASE 4.3: CloudinaryService global
import { CommonServicesModule } from './common/services/common-services.module'; // ✅ FASE 1.3: Numeración
import { ComponentesEquipoModule } from './componentes-equipo/componentes-equipo.module';
import { ComponentesUsadosModule } from './componentes-usados/componentes-usados.module';
import { ContactosAdicionalesModule } from './contactos-adicionales/contactos-adicionales.module';
import { CotizacionesModule } from './cotizaciones/cotizaciones.module';
import { ItemsComponentesModule } from './cotizaciones/items-componentes/items-componentes.module';
import { ItemsServiciosModule } from './cotizaciones/items-servicios/items-servicios.module';
import { PropuestasCorrectivoModule } from './cotizaciones/propuestas-correctivo/propuestas-correctivo.module';
import { PrismaModule } from './database/prisma.module';
import { DetalleServiciosOrdenModule } from './detalle-servicios-orden/detalle-servicios-orden.module';
import { DevolucionesProveedorModule } from './devoluciones-proveedor/devoluciones-proveedor.module';
import { DocumentosGeneradosModule } from './documentos-generados/documentos-generados.module';
import { EmpleadosModule } from './empleados/empleados.module';
import { EquiposBombaModule } from './equipos-bomba/equipos-bomba.module';
import { EquiposGeneradorModule } from './equipos-generador/equipos-generador.module';
import { EquiposMotorModule } from './equipos-motor/equipos-motor.module';
import { EquiposModule } from './equipos/equipos.module';
import { EstadosCotizacionModule } from './estados-cotizacion/estados-cotizacion.module';
import { EstadosOrdenModule } from './estados-orden/estados-orden.module';
import { EvidenciasModule } from './evidencias-fotograficas/evidencias.module';
import { FirmasAdministrativasModule } from './firmas-administrativas/firmas-administrativas.module';
import { FirmasDigitalesModule } from './firmas-digitales/firmas-digitales.module';
import { GastosOrdenModule } from './gastos-orden/gastos-orden.module';
import { HealthModule } from './health/health.module';
import { HistorialEnviosModule } from './historial-envios/historial-envios.module';
import { HistorialEstadosOrdenModule } from './historial-estados-orden/historial-estados-orden.module';
import { InformesModule } from './informes/informes.module';
import { ItemsCotizacionComponentesModule } from './items-cotizacion-componentes/items-cotizacion-componentes.module';
import { ItemsCotizacionServiciosModule } from './items-cotizacion-servicios/items-cotizacion-servicios.module';
import { ItemsPropuestaModule } from './items-propuesta/items-propuesta.module';
import { LotesComponentesModule } from './lotes-componentes/lotes-componentes.module';
import { MedicionesModule } from './mediciones-servicio/mediciones.module';
import { MotivosAjusteModule } from './motivos-ajuste/motivos-ajuste.module';
import { MotivosRechazoModule } from './motivos-rechazo/motivos-rechazo.module';
import { MovimientosInventarioModule } from './movimientos-inventario/movimientos-inventario.module';
import { OrdenesCompraDetalleModule } from './ordenes-compra-detalle/ordenes-compra-detalle.module';
import { OrdenesCompraModule } from './ordenes-compra/ordenes-compra.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { ParametrosMedicionModule } from './parametros-medicion/parametros-medicion.module';
import { PermisosModule } from './permisos/permisos.module';
import { PersonasModule } from './personas/personas.module';
import { PlantillasInformeModule } from './plantillas-informe/plantillas-informe.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { RecepcionesCompraModule } from './recepciones-compra/recepciones-compra.module';
import { RemisionesDetalleModule } from './remisiones-detalle/remisiones-detalle.module';
import { RemisionesModule } from './remisiones/remisiones.module';
import { RolesPermisosModule } from './roles-permisos/roles-permisos.module';
import { RolesModule } from './roles/roles.module';
import { SedesClienteModule } from './sedes-cliente/sedes-cliente.module';
import { TiposComponenteModule } from './tipos-componente/tipos-componente.module';
import { TiposEquipoModule } from './tipos-equipo/tipos-equipo.module';
import { TiposServicioModule } from './tipos-servicio/tipos-servicio.module';
import { UbicacionesBodegaModule } from './ubicaciones-bodega/ubicaciones-bodega.module';
import { UsuariosRolesModule } from './usuarios-roles/usuarios-roles.module';
import { UsuariosModule } from './usuarios/usuarios.module';
// ✅ FASE 7: CRONOGRAMAS - Módulos (Sesión Nov 25)
import { ContratosMantenimientoModule } from './contratos-mantenimiento/contratos-mantenimiento.module';
import { CronogramasServicioModule } from './cronogramas-servicio/cronogramas-servicio.module';
import { EquiposContratoModule } from './equipos-contrato/equipos-contrato.module';
import { HistorialContratoModule } from './historial-contrato/historial-contrato.module';
// ✅ FASE 2.3: SYNC MOBILE - Módulo sincronización offline (Sesión Nov 26)
import { SyncModule } from './sync/sync.module';
// ✅ FASE 3: PDF + EMAIL - Módulos generación documentos y notificaciones (Sesión Nov 27)
import { EmailModule } from './email/email.module';
import { PdfModule } from './pdf/pdf.module';
// ✅ FASE 6 POST-CRUD: NOTIFICACIONES Y CRON - Sistema de notificaciones y tareas programadas (Sesión Nov 28)
import { NotificacionesModule } from './notificaciones/notificaciones.module';
// ✅ FASE 7 BONUS: DASHBOARD - Métricas unificadas para admin (Sesión Nov 28)
import { DashboardModule } from './dashboard/dashboard.module';
// ✅ FASE 6 INVENTARIO: Motor Transaccional Enterprise (Sesión Dic 27)
import { InventarioModule } from './inventario/inventario.module';
// ✅ AGENDA ENTERPRISE: Centro de programación inteligente (Sesión Dic 29)
import { AgendaModule } from './agenda/agenda.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '../.env'), // ✅ CORREGIDO: dist/ → ../.env
    }),
    PrismaModule, // ← PrismaService con conexión real a Supabase
    HealthModule, // ← Health check endpoint para validar conexión DB
    CloudinaryModule, // ✅ FASE 4.3: GLOBAL CloudinaryService
    CommonServicesModule, // ✅ FASE 1.3: Servicio de Numeración automática (26-Nov)
    AuthModule, // ✅ FASE 1: REACTIVADO con schema corregido
    // ✅ FASE 2: USUARIOS - Módulos prerequisitos activados (Sesión 22)
    PersonasModule, // ✅ FASE 2.1: ACTIVADO - Base para proveedores/empleados/clientes
    ClientesModule, // ✅ FASE 2.3: NUEVO - Clientes (Sesión 27)
    EmpleadosModule, // ✅ FASE 2.4: NUEVO - Empleados (Sesión 27)
    ProveedoresModule, // ✅ FASE 2.2: ACTIVADO - Prerequisito para órdenes de compra
    SedesClienteModule, // ✅ FASE 2.5: ACTIVADO - Ubicaciones de clientes
    UsuariosModule, // ✅ FASE 2.7: ACTIVADO - Gestión de usuarios y roles
    RolesModule, // ✅ FASE 2.8: NUEVO - RBAC Core (Sesión 27)
    PermisosModule, // ✅ FASE 2.9: NUEVO - RBAC Core (Sesión 27)
    RolesPermisosModule, // ✅ FASE 2.10: NUEVO - RBAC Junction (Sesión 27)
    UsuariosRolesModule, // ✅ FASE 2.11: NUEVO - RBAC Junction (Sesión 27)
    ContactosAdicionalesModule, // ✅ FASE 2.12: NUEVO - Contactos (Sesión 27)
    CertificacionesTecnicasModule, // ✅ FASE 2.13: NUEVO - Certificaciones (Sesión 27)
    FirmasAdministrativasModule, // ✅ FASE 2.14: NUEVO - Firmas Admin (Sesión 27)
    FirmasDigitalesModule, // ✅ FASE 2.15: NUEVO - Firmas Digitales
    EquiposModule, // ✅ FASE 2: REACTIVADO con schema corregido y PrismaEquipoRepository
    TiposEquipoModule, // ✅ FASE 1: Tipos Equipo CQRS completo (Sesión 25 - Refactorizado de legacy)
    TiposComponenteModule, // ✅ FASE 1: Tipos Componente CQRS completo (Sesión 25 - BLOQUE 1 Catálogos)
    CatalogoComponentesModule, // ✅ FASE 1 BLOQUE 3: Catalogo Componentes CQRS completo (Sesion Nov 19)
    ComponentesEquipoModule, // ✅ FASE 1 BLOQUE 3: Componentes-Equipo N:N CQRS completo (Sesion Nov 19)
    CatalogoSistemasModule, // ✅ FASE 1: Catálogo Sistemas CQRS completo (Sesión 25 - BLOQUE 1 Catálogos - 3/3 complete)
    EquiposMotorModule, // ✅ FASE 1 BLOQUE 2: Equipos Motor CQRS completo (Sesión 25 - 45+ campos, 5 enums, 11 Decimals)
    EquiposGeneradorModule, // ✅ FASE 1 BLOQUE 2: Equipos Generador CQRS completo (Sesión 25 - 38 campos, 6 Decimals)
    EquiposBombaModule, // ✅ FASE 1 BLOQUE 2: Equipos Bomba CQRS completo (Sesión 25 - 50+ campos, 2 enums, 11 Decimals)
    TiposServicioModule, // ✅ FASE 3.1: Tipos Servicio CQRS completo (Sesión 28 - Refactorizado arquitectura completa)
    CatalogoServiciosModule, // ✅ FASE 3.2: Catálogo Servicios CQRS completo (Sesión 30 - 8 endpoints, includes personas corregidos)
    EstadosOrdenModule, // ✅ FASE 3.3: Estados Orden CQRS completo (Sesión 30 - Catálogo metadata estados, 8 endpoints)
    ParametrosMedicionModule, // ✅ FASE 3.4: Parámetros Medición CQRS completo (Sesión 31 - 8 endpoints, 23 campos, validaciones rangos)
    CatalogoActividadesModule, // ✅ FASE 3.6: Catálogo Actividades CQRS completo (Sesión 32 - 20 campos, 5 FKs, 1 ENUM, includes con nombres largos)
    DetalleServiciosOrdenModule, // ✅ FASE 3.7: Detalle Servicios Orden CQRS completo (Sesión 32 - 21 campos, 5 FKs, 1 ENUM, nombres relaciones 60 chars)
    HistorialEstadosOrdenModule, // ✅ FASE 3.8: Historial Estados Orden CQRS completo (Sesión ACTUAL - 13 campos, 4 FKs, INMUTABLE Event Sourcing, nombres relaciones 69 chars)
    OrdenesModule, // ✅ FASE 3: REACTIVADO con workflow completo
    ActividadesEjecutadasModule, // ✅ FASE 4.1: REACTIVADO - Actividades ejecutadas
    MedicionesModule, // ✅ FASE 4.2: REACTIVADO - Mediciones con rangos automáticos
    EvidenciasModule, // ✅ FASE 4.3: REACTIVADO - Evidencias Cloudinary
    ComponentesUsadosModule, // ✅ FASE 3.12: NUEVO - Componentes Usados CQRS completo (Tabla 12/14)
    GastosOrdenModule, // ✅ FASE 3.13: NUEVO - Gastos Orden CQRS completo (Tabla 13/14)
    CotizacionesModule, // ✅ FASE 4.4: NUEVO - Cotizaciones (correcciones TypeScript aplicadas)
    ItemsServiciosModule, // ✅ FASE 4.5: NUEVO - Items Servicios Cotización
    ItemsComponentesModule, // ✅ FASE 4.5: NUEVO - Items Componentes Cotización
    HistorialEnviosModule, // ✅ FASE 4.6: NUEVO - Historial Envíos Testing
    PropuestasCorrectivoModule, // ✅ FASE 4.9: NUEVO - Propuestas Correctivo
    EstadosCotizacionModule, // ✅ FASE 4: Estados Cotización CQRS completo
    MotivosRechazoModule, // ✅ FASE 4: Motivos Rechazo CQRS completo
    AprobacionesCotizacionModule, // ✅ FASE 4: Aprobaciones Cotización CQRS completo
    ItemsPropuestaModule, // ✅ FASE 4: Items Propuesta CQRS completo
    ItemsCotizacionServiciosModule, // ✅ FASE 4: Items Cotización Servicios CQRS completo
    ItemsCotizacionComponentesModule, // ✅ FASE 4: Items Cotización Componentes CQRS completo
    MovimientosInventarioModule, // ✅ FASE 5.1: NUEVO - Movimientos Inventario Event Sourcing (código 100% completo)
    UbicacionesBodegaModule, // ✅ FASE 5.3: NUEVO - Ubicaciones Bodega CQRS 100% (completado sesión 19)
    LotesComponentesModule, // ✅ FASE 5.4: NUEVO - Lotes Componentes CQRS 100% (completado sesión 19)
    AlertasStockModule, // ✅ FASE 5.5: Alertas Stock CQRS - Schema aligned (descripcion_corta, codigo_interno, alertas_stock, cantidad_actual, codigo_lote)
    OrdenesCompraModule, // ✅ FASE 5.6: Órdenes Compra (código base generado)
    RecepcionesCompraModule, // ✅ FASE 5.7: Recepciones Compra (código base generado)
    DevolucionesProveedorModule, // ✅ FASE 5.8: Devoluciones Proveedor (código base generado)
    MotivosAjusteModule, // ✅ FASE 5.9: Motivos Ajuste CQRS completo (Sesión 25)
    RemisionesModule, // ✅ FASE 5.2: Schema aligned and validated - 100% functional
    RemisionesDetalleModule, // ✅ FASE 5.10: Remisiones Detalle CQRS completo
    OrdenesCompraDetalleModule, // ✅ FASE 5.11: Órdenes Compra Detalle CQRS completo
    // ✅ FASE 6: INFORMES - Módulos (Sesión Nov 25)
    PlantillasInformeModule, // ✅ FASE 6.1: Plantillas Informe CRUD completo
    InformesModule, // ✅ FASE 6.2: Informes CRUD completo
    DocumentosGeneradosModule, // ✅ FASE 6.3: Documentos Generados CRUD completo
    BitacorasModule, // ✅ FASE 6.4: Bitácoras CRUD completo
    BitacorasInformesModule, // ✅ FASE 6.5: Bitácoras-Informes N:N CRUD completo
    // ✅ FASE 7: CRONOGRAMAS - Módulos (Sesión Nov 25)
    ContratosMantenimientoModule, // ✅ FASE 7.1: Contratos Mantenimiento CRUD completo
    EquiposContratoModule, // ✅ FASE 7.2: Equipos Contrato N:N CRUD completo
    CronogramasServicioModule, // ✅ FASE 7.3: Cronogramas Servicio CRUD completo
    HistorialContratoModule, // ✅ FASE 7.4: Historial Contrato CRUD completo
    // ✅ FASE 2.3: SYNC MOBILE - Sincronización offline (Sesión Nov 26)
    SyncModule, // ✅ POST /sync/ordenes + GET /sync/download/:tecnicoId
    // ✅ FASE 3: PDF + EMAIL - Generación documentos y notificaciones (Sesión Nov 27)
    PdfModule, // ✅ GET /pdf/ordenes/:id + GET /pdf/prueba - PDFs con Puppeteer
    EmailModule, // ✅ POST /email/test + POST /email/orden - Nodemailer SMTP
    // ✅ FASE 6 POST-CRUD: NOTIFICACIONES Y CRON (Sesión Nov 28)
    NotificacionesModule, // ✅ GET/PATCH /notificaciones + CRON jobs (recordatorios, vencimientos)
    // ✅ FASE 7 BONUS: DASHBOARD (Sesión Nov 28)
    DashboardModule, // ✅ GET /dashboard - Métricas unificadas para admin
    // ✅ FASE 6 INVENTARIO: Motor Transaccional Enterprise (Sesión Dic 27)
    InventarioModule, // ✅ POST /inventario/entrada, /salida, /ajuste + GET /kardex, /dashboard
    // ✅ AGENDA ENTERPRISE: Centro de programación inteligente (Sesión Dic 29)
    AgendaModule, // ✅ GET /agenda/hoy, /semana, /mes, /metricas, /carga-tecnicos, /calendario
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
