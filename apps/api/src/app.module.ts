import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { ActividadesEjecutadasModule } from './actividades-ejecutadas/actividades.module';
import { AlertasStockModule } from './alertas-stock/alertas-stock.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CatalogoComponentesModule } from './catalogo-componentes/catalogo-componentes.module';
import { CatalogoSistemasModule } from './catalogo-sistemas/catalogo-sistemas.module';
import { ClientesModule } from './clientes/clientes.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module'; // ✅ FASE 4.3: CloudinaryService global
import { ComponentesEquipoModule } from './componentes-equipo/componentes-equipo.module';
import { CotizacionesModule } from './cotizaciones/cotizaciones.module';
import { ItemsComponentesModule } from './cotizaciones/items-componentes/items-componentes.module';
import { ItemsServiciosModule } from './cotizaciones/items-servicios/items-servicios.module';
import { PropuestasCorrectivoModule } from './cotizaciones/propuestas-correctivo/propuestas-correctivo.module';
import { PrismaModule } from './database/prisma.module';
import { DevolucionesProveedorModule } from './devoluciones-proveedor/devoluciones-proveedor.module';
import { EmpleadosModule } from './empleados/empleados.module';
import { EquiposBombaModule } from './equipos-bomba/equipos-bomba.module';
import { EquiposGeneradorModule } from './equipos-generador/equipos-generador.module';
import { EquiposMotorModule } from './equipos-motor/equipos-motor.module';
import { EquiposModule } from './equipos/equipos.module';
import { EvidenciasModule } from './evidencias-fotograficas/evidencias.module';
import { HealthModule } from './health/health.module';
import { HistorialEnviosModule } from './historial-envios/historial-envios.module';
import { LotesComponentesModule } from './lotes-componentes/lotes-componentes.module';
import { MedicionesModule } from './mediciones-servicio/mediciones.module';
import { MotivosAjusteModule } from './motivos-ajuste/motivos-ajuste.module';
import { MovimientosInventarioModule } from './movimientos-inventario/movimientos-inventario.module';
import { OrdenesCompraModule } from './ordenes-compra/ordenes-compra.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { PersonasModule } from './personas/personas.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { RecepcionesCompraModule } from './recepciones-compra/recepciones-compra.module';
import { RemisionesModule } from './remisiones/remisiones.module';
import { SedesClienteModule } from './sedes-cliente/sedes-cliente.module';
import { TiposComponenteModule } from './tipos-componente/tipos-componente.module';
import { TiposEquipoModule } from './tipos-equipo/tipos-equipo.module';
import { UbicacionesBodegaModule } from './ubicaciones-bodega/ubicaciones-bodega.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '../.env'), // ✅ CORREGIDO: dist/ → ../.env
    }),
    PrismaModule, // ← PrismaService con conexión real a Supabase
    HealthModule, // ← Health check endpoint para validar conexión DB
    CloudinaryModule, // ✅ FASE 4.3: GLOBAL CloudinaryService
    AuthModule, // ✅ FASE 1: REACTIVADO con schema corregido
    // ✅ FASE 2: USUARIOS - Módulos prerequisitos activados (Sesión 22)
    PersonasModule, // ✅ FASE 2.1: ACTIVADO - Base para proveedores/empleados/clientes
    ClientesModule, // ✅ FASE 2.3: NUEVO - Clientes (Sesión 27)
    EmpleadosModule, // ✅ FASE 2.4: NUEVO - Empleados (Sesión 27)
    ProveedoresModule, // ✅ FASE 2.2: ACTIVADO - Prerequisito para órdenes de compra
    SedesClienteModule, // ✅ FASE 2.5: ACTIVADO - Ubicaciones de clientes
    UsuariosModule, // ✅ FASE 2.7: ACTIVADO - Gestión de usuarios y roles
    EquiposModule, // ✅ FASE 2: REACTIVADO con schema corregido y PrismaEquipoRepository
    TiposEquipoModule, // ✅ FASE 1: Tipos Equipo CQRS completo (Sesión 25 - Refactorizado de legacy)
    TiposComponenteModule, // ✅ FASE 1: Tipos Componente CQRS completo (Sesión 25 - BLOQUE 1 Catálogos)
    CatalogoComponentesModule, // ✅ FASE 1 BLOQUE 3: Catalogo Componentes CQRS completo (Sesion Nov 19)
    ComponentesEquipoModule, // ✅ FASE 1 BLOQUE 3: Componentes-Equipo N:N CQRS completo (Sesion Nov 19)
    CatalogoSistemasModule, // ✅ FASE 1: Catálogo Sistemas CQRS completo (Sesión 25 - BLOQUE 1 Catálogos - 3/3 complete)
    EquiposMotorModule, // ✅ FASE 1 BLOQUE 2: Equipos Motor CQRS completo (Sesión 25 - 45+ campos, 5 enums, 11 Decimals)
    EquiposGeneradorModule, // ✅ FASE 1 BLOQUE 2: Equipos Generador CQRS completo (Sesión 25 - 38 campos, 6 Decimals)
    EquiposBombaModule, // ✅ FASE 1 BLOQUE 2: Equipos Bomba CQRS completo (Sesión 25 - 50+ campos, 2 enums, 11 Decimals)
    OrdenesModule, // ✅ FASE 3: REACTIVADO con workflow completo
    ActividadesEjecutadasModule, // ✅ FASE 4.1: REACTIVADO - Actividades ejecutadas
    MedicionesModule, // ✅ FASE 4.2: REACTIVADO - Mediciones con rangos automáticos
    EvidenciasModule, // ✅ FASE 4.3: REACTIVADO - Evidencias Cloudinary
    CotizacionesModule, // ✅ FASE 4.4: NUEVO - Cotizaciones (correcciones TypeScript aplicadas)
    ItemsServiciosModule, // ✅ FASE 4.5: NUEVO - Items Servicios Cotización
    ItemsComponentesModule, // ✅ FASE 4.5: NUEVO - Items Componentes Cotización
    HistorialEnviosModule, // ✅ FASE 4.6: NUEVO - Historial Envíos Testing
    PropuestasCorrectivoModule, // ✅ FASE 4.9: NUEVO - Propuestas Correctivo
    MovimientosInventarioModule, // ✅ FASE 5.1: NUEVO - Movimientos Inventario Event Sourcing (código 100% completo)
    UbicacionesBodegaModule, // ✅ FASE 5.3: NUEVO - Ubicaciones Bodega CQRS 100% (completado sesión 19)
    LotesComponentesModule, // ✅ FASE 5.4: NUEVO - Lotes Componentes CQRS 100% (completado sesión 19)
    AlertasStockModule, // ✅ FASE 5.5: Alertas Stock CQRS - Schema aligned (descripcion_corta, codigo_interno, alertas_stock, cantidad_actual, codigo_lote)
    OrdenesCompraModule, // ✅ FASE 5.6: Órdenes Compra (código base generado)
    RecepcionesCompraModule, // ✅ FASE 5.7: Recepciones Compra (código base generado)
    DevolucionesProveedorModule, // ✅ FASE 5.8: Devoluciones Proveedor (código base generado)
    MotivosAjusteModule, // ✅ FASE 5.9: Motivos Ajuste CQRS completo (Sesión 25)
    RemisionesModule, // ✅ FASE 5.2: Schema aligned and validated - 100% functional
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
