/// Motor Declarativo Puro para resolución de controles de ejecución.
///
/// Reglas Zero-Trust:
/// 1. `rolSemantico` del servidor manda siempre que esté definido.
/// 2. `tipoControlInput` explícito del catálogo (`ESCALA_ESTADO`, `BINARIO`,
///    `CONFORMIDAD`, `NIVEL`, `ESTADO_OPERATIVO`, `OPCIONES`, `PERSONALIZADO`,
///    `LECTURA_CONTADOR`, `SUBSISTEMAS_EQUIPO`, `TEXTO`, `TEXTO_LARGO`, `LISTA_ITEMS`)
///    NO puede ser secuestrado por heurísticas de texto sobre la descripción.
///    En particular, una actividad titulada "Verificar Temperatura de Tablero"
///    con `tipoControlInput = 'ESCALA_ESTADO'` DEBE renderizar chips `B/R/M/C/NA`.
/// 3. Solo cuando la actividad carece de entrada en el catálogo sincronizado
///    (`hasCatalogEntry == false`) se aplica el fallback legacy retrocompatible.
library;

enum DeclarativeControlKind {
  escalaEstado,
  lecturaContador,
  subsistemasEquipo,
  selectorOpciones,
  corrEstadoInicial,
  corrEstadoFinal,
  corrTextoProblema,
  corrTextoSintomas,
  corrTextoDiagnostico,
  corrTextoTrabajos,
  corrPendientes,
  corrTextoRecomendaciones,
  corrListaRepuestos,
  corrListaMateriales,
  legacySiNo,
  legacyNivelCombustible,
  legacyNivelAceite,
  legacyElectrolitos,
  legacyBateria,
  legacyTemperatura,
}

class DeclarativeActivityResolution {
  final DeclarativeControlKind kind;
  final String? controlType;

  const DeclarativeActivityResolution({
    required this.kind,
    this.controlType,
  });
}

class DeclarativeActivityResolver {
  DeclarativeActivityResolver._();

  static DeclarativeActivityResolution resolve({
    required String descripcion,
    String? tipoControlInput,
    String? rolSemantico,
    bool hasCatalogEntry = true,
  }) {
    final rol = (rolSemantico ?? '').trim().toUpperCase();
    switch (rol) {
      case 'LECTURA_CONTADOR_ACTIVO':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.lecturaContador,
        );
      case 'CORR_ESTADO_INICIAL':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrEstadoInicial,
        );
      case 'CORR_ESTADO_FINAL':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrEstadoFinal,
        );
      case 'CORR_SISTEMAS_AFECTADOS':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.subsistemasEquipo,
        );
      case 'CORR_PROBLEMA':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrTextoProblema,
        );
      case 'CORR_FALLAS':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrTextoSintomas,
        );
      case 'CORR_DIAGNOSTICO':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrTextoDiagnostico,
        );
      case 'CORR_TRABAJOS':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrTextoTrabajos,
        );
      case 'CORR_PENDIENTES':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrPendientes,
        );
      case 'CORR_RECOMENDACIONES':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrTextoRecomendaciones,
        );
      case 'CORR_REPUESTOS':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrListaRepuestos,
        );
      case 'CORR_MATERIALES':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrListaMateriales,
        );
    }

    final tipoControl = (tipoControlInput ?? '').trim().toUpperCase();
    if (tipoControl == 'LECTURA_CONTADOR') {
      return const DeclarativeActivityResolution(
        kind: DeclarativeControlKind.lecturaContador,
      );
    }
    if (tipoControl == 'SUBSISTEMAS_EQUIPO') {
      return const DeclarativeActivityResolution(
        kind: DeclarativeControlKind.subsistemasEquipo,
      );
    }
    if (tipoControl == 'TEXTO' || tipoControl == 'TEXTO_LARGO') {
      return const DeclarativeActivityResolution(
        kind: DeclarativeControlKind.corrTextoTrabajos,
      );
    }
    if (tipoControl == 'LISTA_ITEMS') {
      return const DeclarativeActivityResolution(
        kind: DeclarativeControlKind.corrListaRepuestos,
      );
    }
    if (tipoControl.isNotEmpty && tipoControl != 'ESCALA_ESTADO') {
      return DeclarativeActivityResolution(
        kind: DeclarativeControlKind.selectorOpciones,
        controlType: tipoControl,
      );
    }

    // Regla crítica anti-secuestro: si la actividad proviene del catálogo y
    // tiene configurado `ESCALA_ESTADO`, respetar B/R/M/C/NA sin heurísticas de texto.
    if (hasCatalogEntry && tipoControl == 'ESCALA_ESTADO') {
      return const DeclarativeActivityResolution(
        kind: DeclarativeControlKind.escalaEstado,
        controlType: 'ESCALA_ESTADO',
      );
    }

    // Fallback legacy solo para registros antiguos sin metadatos del catálogo.
    final legacy = legacyTipoEspecial(descripcion);
    switch (legacy) {
      case 'CORR_ESTADO_INICIAL':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrEstadoInicial,
        );
      case 'CORR_ESTADO_FINAL':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrEstadoFinal,
        );
      case 'CORR_SISTEMAS_AFECTADOS':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.subsistemasEquipo,
        );
      case 'CORR_TEXTO_PROBLEMA':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrTextoProblema,
        );
      case 'CORR_TEXTO_SINTOMAS':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrTextoSintomas,
        );
      case 'CORR_TEXTO_DIAGNOSTICO':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrTextoDiagnostico,
        );
      case 'CORR_TEXTO_TRABAJOS':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrTextoTrabajos,
        );
      case 'CORR_TEXTO_PENDIENTES':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrPendientes,
        );
      case 'CORR_TEXTO_RECOMENDACIONES':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrTextoRecomendaciones,
        );
      case 'CORR_LISTA_REPUESTOS':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrListaRepuestos,
        );
      case 'CORR_LISTA_MATERIALES':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.corrListaMateriales,
        );
      case 'SI_NO':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.legacySiNo,
        );
      case 'NIVEL_COMBUSTIBLE':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.legacyNivelCombustible,
        );
      case 'NIVEL_ACEITE':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.legacyNivelAceite,
        );
      case 'ELECTROLITOS':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.legacyElectrolitos,
        );
      case 'HOROMETRO':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.lecturaContador,
        );
      case 'BATERIA':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.legacyBateria,
        );
      case 'TEMPERATURA':
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.legacyTemperatura,
        );
      default:
        return const DeclarativeActivityResolution(
          kind: DeclarativeControlKind.escalaEstado,
          controlType: 'ESCALA_ESTADO',
        );
    }
  }

  static String? legacyTipoEspecial(String descripcion) {
    final desc = descripcion.toUpperCase();
    if (desc.contains('ESTADO INICIAL DEL EQUIPO')) return 'CORR_ESTADO_INICIAL';
    if (desc.contains('ESTADO FINAL DEL EQUIPO')) return 'CORR_ESTADO_FINAL';
    if (desc.contains('SISTEMAS AFECTADOS')) return 'CORR_SISTEMAS_AFECTADOS';
    if (desc.contains('DESCRIPCIÓN DEL PROBLEMA') ||
        desc.contains('DESCRIPCION DEL PROBLEMA')) {
      return 'CORR_TEXTO_PROBLEMA';
    }
    if (desc.contains('SÍNTOMAS OBSERVADOS') ||
        desc.contains('SINTOMAS OBSERVADOS') ||
        desc.contains('FALLAS OBSERVADAS')) {
      return 'CORR_TEXTO_SINTOMAS';
    }
    if (desc.contains('DIAGNÓSTICO') || desc.contains('DIAGNOSTICO')) {
      return 'CORR_TEXTO_DIAGNOSTICO';
    }
    if (desc.contains('TRABAJOS REALIZADOS')) return 'CORR_TEXTO_TRABAJOS';
    if (desc.contains('TRABAJOS PENDIENTES')) return 'CORR_TEXTO_PENDIENTES';
    if (desc.contains('RECOMENDACIONES')) return 'CORR_TEXTO_RECOMENDACIONES';
    if (desc.contains('REPUESTOS UTILIZADOS')) return 'CORR_LISTA_REPUESTOS';
    if (desc.contains('MATERIALES E INSUMOS')) return 'CORR_LISTA_MATERIALES';
    if (desc.contains('(SI/NO)') || desc.contains('(S/N)')) return 'SI_NO';
    if ((desc.contains('NIVEL DE COMBUSTIBLE') ||
            desc.contains('NIVEL COMBUSTIBLE')) &&
        !desc.contains('TANQUE')) {
      return 'NIVEL_COMBUSTIBLE';
    }
    if (desc.contains('NIVEL DE ACEITE') || desc.contains('NIVEL ACEITE')) {
      return 'NIVEL_ACEITE';
    }
    if (desc.contains('HOROMETRO') ||
        desc.contains('HORÓMETRO') ||
        desc.contains('HORAS DE TRABAJO') ||
        desc.contains('HORAS TRABAJO') ||
        desc.contains('LECTURA DE HORAS') ||
        desc.contains('CONTADOR') ||
        desc.contains('CICLOS') ||
        desc.contains('ODOMETRO') ||
        desc.contains('ODÓMETRO') ||
        desc.contains('KILOMETRAJE')) {
      return 'HOROMETRO';
    }
    if (desc.contains('ELECTROLITOS')) return 'ELECTROLITOS';
    if (desc.contains('CARGA DE BATERIA') &&
        !desc.contains('CARGADOR') &&
        !desc.contains('SISTEMA DE CARGA')) {
      return 'BATERIA';
    }
    if (desc.contains('TEMPERATURA') || desc.contains('TEMP.')) {
      return 'TEMPERATURA';
    }
    return null;
  }
}
