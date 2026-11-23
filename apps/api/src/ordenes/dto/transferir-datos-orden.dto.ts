import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export type AccionEquipoTransferencia =
  | 'MAPEAR_A_DESTINO'
  | 'AGREGAR_A_DESTINO'
  | 'DESCARTAR';

export type TipoCoincidenciaEquipo =
  | 'EXACTA_ID_EQUIPO'
  | 'EXACTA_CODIGO_SERIE'
  | 'SUGERIDA_MISMO_TIPO'
  | 'SUGERIDA_POSICIONAL'
  | 'SIN_DESTINO';

export class MapeoEquipoTransferenciaDto {
  @ApiProperty({
    description:
      'ID de ordenes_equipos en la orden origen (0 si origen es ultra-legacy sin filas en ordenes_equipos)',
    example: 101,
  })
  @IsInt()
  idOrdenEquipoOrigen!: number;

  @ApiProperty({
    enum: ['MAPEAR_A_DESTINO', 'AGREGAR_A_DESTINO', 'DESCARTAR'],
    description: 'Acción a ejecutar para los datos de este equipo del origen',
  })
  @IsIn(['MAPEAR_A_DESTINO', 'AGREGAR_A_DESTINO', 'DESCARTAR'])
  accion!: AccionEquipoTransferencia;

  @ApiPropertyOptional({
    description:
      'ID de ordenes_equipos en la orden destino (requerido cuando accion = MAPEAR_A_DESTINO; 0 si destino ultra-legacy)',
    nullable: true,
    example: 205,
  })
  @IsOptional()
  @IsInt()
  idOrdenEquipoDestino?: number | null;
}

export class OpcionesTransferenciaDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  incluirActividades?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  incluirMediciones?: boolean;

  @ApiPropertyOptional({
    description:
      'Cuando los tipos de equipo origen y destino difieren, omite parámetros específicos de otro tipo de equipo para evitar contaminación técnica',
  })
  @IsOptional()
  @IsBoolean()
  soloMedicionesCompatibles?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  incluirEvidenciasEquipo?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  incluirFotosGenerales?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  incluirObservaciones?: boolean;

  @ApiPropertyOptional({
    description:
      'Copiar firmas digitales y datos de recepción del cliente (por defecto true si mismo cliente, false si cliente distinto)',
  })
  @IsOptional()
  @IsBoolean()
  incluirFirmas?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  incluirComponentes?: boolean;

  @ApiPropertyOptional({
    description:
      'Reemplazar ordenes_actividades_plan del destino (por defecto true solo si mismo tipo de servicio y tipos de equipo compatibles)',
  })
  @IsOptional()
  @IsBoolean()
  copiarPlanActividades?: boolean;

  @ApiPropertyOptional({
    description:
      'Transferir pendientes registrados (ordenes_pendientes) reasignados al cliente y equipos destino',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  incluirPendientes?: boolean;

  @ApiPropertyOptional({
    description:
      'Mantener descripcion_inicial existente en la orden destino en lugar de sobrescribirla con la del origen',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  conservarDescripcionDestino?: boolean;
}

export class PreviewTransferenciaOrdenDto {
  @ApiProperty({ description: 'ID numérico de la orden ORIGEN', example: 78 })
  @IsInt()
  idOrdenOrigen!: number;
}

export class TransferirDatosOrdenDto {
  @ApiProperty({ description: 'ID numérico de la orden ORIGEN', example: 78 })
  @IsInt()
  idOrdenOrigen!: number;

  @ApiPropertyOptional({
    type: [MapeoEquipoTransferenciaDto],
    description:
      'Mapeo explícito equipo origen → equipo destino / agregar / descartar. Si se omite, el motor aplica automáticamente el emparejamiento inteligente 1:1.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MapeoEquipoTransferenciaDto)
  mapeoEquipos?: MapeoEquipoTransferenciaDto[];

  @ApiPropertyOptional({
    type: OpcionesTransferenciaDto,
    description: 'Opciones granulares de qué bloques transferir',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpcionesTransferenciaDto)
  opciones?: OpcionesTransferenciaDto;
}

export interface EquipoTransferenciaInfo {
  idOrdenEquipo: number;
  esVirtual: boolean;
  ordenSecuencia: number;
  idEquipo: number;
  codigoEquipo: string;
  nombreEquipo: string;
  nombreSistema: string | null;
  numeroSerie: string | null;
  idTipoEquipo: number | null;
  nombreTipoEquipo: string;
  estado: string | null;
}

export interface ConteosEquipoOrigen {
  actividades: number;
  mediciones: number;
  evidencias: number;
  pendientes: number;
}

export interface SugerenciaMapeoEquipo {
  origen: EquipoTransferenciaInfo;
  conteos: ConteosEquipoOrigen;
  tipoCoincidencia: TipoCoincidenciaEquipo;
  accionSugerida: AccionEquipoTransferencia;
  idOrdenEquipoDestinoSugerido: number | null;
  destinoSugerido: EquipoTransferenciaInfo | null;
  tiposCompatibles: boolean;
  puedeAgregarADestino: boolean;
  motivoNoAgregar?: string | null;
  nota: string;
}

export interface AdvertenciaTransferencia {
  nivel: 'info' | 'warning' | 'danger';
  codigo: string;
  mensaje: string;
}

export interface PreviewTransferenciaResponse {
  puedeTransferir: boolean;
  bloqueos: string[];
  advertencias: AdvertenciaTransferencia[];
  origen: {
    id: number;
    numero: string;
    estado: string;
    estadoNombre: string;
    idCliente: number;
    nombreCliente: string;
    idTipoServicio: number | null;
    nombreTipoServicio: string;
    totalEquipos: number;
    esMultiEquipo: boolean;
    tieneDatosLegacySinFk: boolean;
    equipos: EquipoTransferenciaInfo[];
  };
  destino: {
    id: number;
    numero: string;
    estado: string;
    estadoNombre: string;
    idCliente: number;
    nombreCliente: string;
    idTipoServicio: number | null;
    nombreTipoServicio: string;
    tieneDescripcionInicial: boolean;
    totalEquipos: number;
    esMultiEquipo: boolean;
    equipos: EquipoTransferenciaInfo[];
    datosExistentesQueSeSobrescribiran: {
      actividades: number;
      mediciones: number;
      evidencias: number;
      lotesGaleria: number;
      componentes: number;
      planActividades: number;
      pendientes: number;
    };
  };
  compatibilidad: {
    mismoCliente: boolean;
    mismoTipoServicio: boolean;
    todosMismoTipoEquipo: boolean;
    hayCruceDeTipos: boolean;
    coincidenciasExactas: number;
    coincidenciasSugeridas: number;
    equiposExcedentesOrigen: number;
    equiposDestinoSinAsignar: EquipoTransferenciaInfo[];
  };
  resumenDatosOrigen: {
    totalActividades: number;
    totalMediciones: number;
    medicionesIncompatiblesEstimadas: number;
    totalEvidenciasEquipo: number;
    totalFotosGenerales: number;
    totalFotosHuerfanasComoGenerales: number;
    totalLotesGaleria: number;
    totalComponentes: number;
    totalPlanActividades: number;
    totalPendientes: number;
    tieneFirmaTecnico: boolean;
    tieneFirmaCliente: boolean;
    tieneObservaciones: boolean;
  };
  mapeoSugerido: SugerenciaMapeoEquipo[];
  opcionesSugeridas: Required<OpcionesTransferenciaDto>;
}

export interface ResultadoTransferenciaResponse {
  success: boolean;
  message: string;
  ordenOrigen: { id: number; numero: string };
  ordenDestino: { id: number; numero: string };
  estadisticas: {
    camposDirectos: boolean;
    ordenesEquipos: number;
    equiposMapeados: number;
    equiposAgregados: number;
    equiposDescartados: number;
    actividadesEjecutadas: number;
    actividadesDescartadas: number;
    evidenciasFotograficas: number;
    evidenciasEquipo: number;
    evidenciasGenerales: number;
    evidenciasDescartadas: number;
    lotesGaleria: number;
    medicionesServicio: number;
    medicionesDescartadas: number;
    medicionesIncompatiblesOmitidas: number;
    componentesUsados: number;
    ordenesActividadesPlan: number;
    pendientesTransferidos: number;
  };
  mapeoAplicado: Array<{
    idOrdenEquipoOrigen: number;
    equipoOrigenNombre: string;
    accion: AccionEquipoTransferencia;
    idOrdenEquipoDestino: number | null;
    equipoDestinoNombre: string | null;
  }>;
}
