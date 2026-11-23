import {
  evaluarGobernanzaCpq,
  type PoliticasGobernanzaCpq,
} from './solicitar-aprobacion.handler';

describe('evaluarGobernanzaCpq (Reglas de Gobernanza CPQ — Exclusivo COT)', () => {
  const basePoliticas: PoliticasGobernanzaCpq = {
    enable_cpq_governance: true,
    moneda: 'COP',
    simbolo: '$',
    locale: 'es-CO',
    decimales: 0,
    umbral_aprobacion_supervisor: 2000000,
    umbral_aprobacion_gerente: 8000000,
    descuento_max_sin_aprobacion: 10,
    margen_minimo_alerta: 25,
    margen_minimo_aprobacion: 18,
  };

  it('Regla 2 (Bypass universal): si enable_cpq_governance === false, nunca bloquea ni alerta', () => {
    const res = evaluarGobernanzaCpq(99000000, 50, 90000000, 5, {
      ...basePoliticas,
      enable_cpq_governance: false,
    });
    expect(res.nivel).toBe('NINGUNO');
    expect(res.estadoGobernanza).toBe('MODO_AGIL');
    expect(res.alertaMargen).toBe(false);
  });

  it('Regla 3 (Omisión individual): umbrales o porcentajes en 0 o null se ignoran individualmente', () => {
    const res = evaluarGobernanzaCpq(25000000, 40, 20000000, 10, {
      ...basePoliticas,
      umbral_aprobacion_supervisor: 0,
      umbral_aprobacion_gerente: 0,
      descuento_max_sin_aprobacion: 0,
      margen_minimo_alerta: 0,
      margen_minimo_aprobacion: 0,
    });
    expect(res.nivel).toBe('NINGUNO');
    expect(res.estadoGobernanza).toBe('LIBRE');
    expect(res.alertaMargen).toBe(false);
  });

  it('Regla 4 (Costo 0): si costoTotal === 0, omite bloqueo y alerta por margen mínimo', () => {
    const res = evaluarGobernanzaCpq(1000000, 0, 0, 0, basePoliticas);
    expect(res.nivel).toBe('NINGUNO');
    expect(res.estadoGobernanza).toBe('LIBRE');
    expect(res.alertaMargen).toBe(false);
  });

  it('Regla 5 (Jerarquía): GERENTE > SUPERVISOR > ALERTA_MARGEN > LIBRE', () => {
    // Dispara Supervisor por monto (3M > 2M) Y Gerente por margen (12% < 18%) => prevalece GERENTE
    const resGerente = evaluarGobernanzaCpq(3000000, 5, 2500000, 12, basePoliticas);
    expect(resGerente.nivel).toBe('GERENTE');
    expect(resGerente.estadoGobernanza).toBe('GERENTE');
    expect(resGerente.alertaMargen).toBe(true);

    // Dispara Supervisor por descuento (12% > 10%) Y Alerta visual de margen (21% < 25%) => prevalece SUPERVISOR
    const resSup = evaluarGobernanzaCpq(1500000, 12, 1000000, 21, basePoliticas);
    expect(resSup.nivel).toBe('SUPERVISOR');
    expect(resSup.estadoGobernanza).toBe('SUPERVISOR');
    expect(resSup.alertaMargen).toBe(true);

    // Solo Alerta Visual de Margen (22% entre 18% y 25%) => NO bloquea (NINGUNO), estado ALERTA_MARGEN
    const resAlerta = evaluarGobernanzaCpq(1500000, 5, 1000000, 22, basePoliticas);
    expect(resAlerta.nivel).toBe('NINGUNO');
    expect(resAlerta.estadoGobernanza).toBe('ALERTA_MARGEN');
    expect(resAlerta.alertaMargen).toBe(true);

    // Todo dentro de política => LIBRE
    const resLibre = evaluarGobernanzaCpq(1500000, 5, 800000, 35, basePoliticas);
    expect(resLibre.nivel).toBe('NINGUNO');
    expect(resLibre.estadoGobernanza).toBe('LIBRE');
    expect(resLibre.alertaMargen).toBe(false);
  });
});
