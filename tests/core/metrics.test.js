import { describe, it, expect } from 'vitest';
import {
  calcReturnPct,
  calcRealReturn,
  calcXIRR,
  calcBreakevenRate,
  calcSensitivityTable
} from '../../src/core/metrics.js';
import { toDayNum } from '../../src/core/dates.js';
import { calibrateModel, getVNAFactor } from '../../src/core/calibration.js';

describe('Motor Financeiro: Métricas & Análise de Risco', () => {
  it('calcula a rentabilidade percentual simples', () => {
    expect(calcReturnPct(130, 100)).toBeCloseTo(0.30, 4);
    expect(calcReturnPct(32147.92, 24658.90)).toBeCloseTo(0.3037, 4);
    expect(calcReturnPct(0, 100)).toBe(-1.0);
  });

  it('calcula o retorno real deduzindo a inflação via relação de Fisher', () => {
    // 30% nominal com 5% de inflação -> (1 + 0.30)/(1 + 0.05) - 1 = 1.30/1.05 - 1 = 23.81%
    const realRet = calcRealReturn(0.30, 0.05);
    expect(realRet).toBeCloseTo(0.2381, 4);
  });

  it('calcula a Taxa Interna de Retorno (TIR / XIRR) anualizada para fluxos de caixa reais', () => {
    // Exemplo: investimento de R$ 10.000 em 01/01/2026 e resgate de R$ 11.000 em 01/01/2027 (1 ano exato = 10% a.a.)
    const d0 = toDayNum('2026-01-01');
    const d1 = toDayNum('2027-01-01');
    const flows = [
      { dn: d0, amount: -10000 },
      { dn: d1, amount: 11000 }
    ];

    const tir = calcXIRR(flows);
    expect(tir).toBeCloseTo(0.10, 2);
  });

  it('calcula a taxa de empate (breakeven) onde o investidor não tem prejuízo', () => {
    const lots = [
      { date: '2026-01-23', rate: 6.99, price: 185.02, qty: 25.35 },
      { date: '2026-03-24', rate: 7.14, price: 177.03, qty: 56.48 },
      { date: '2026-06-08', rate: 7.27, price: 172.89, qty: 28.92 },
      { date: '2026-07-30', rate: 7.37, price: 168.02, qty: 29.58 }
    ];
    const refDate = '2026-10-05';
    const cal = calibrateModel({ refDate, refPrice: 243.38, lots });
    const vnaFactor = getVNAFactor(cal.refDN, cal.refDN, cal.Fref, 4.5);

    // Na data de hoje, para o saldo líquido empatar com o custo (R$ 24.658,90), a taxa precisa subir bastante
    const beRate = calcBreakevenRate({
      lots,
      simDN: cal.refDN,
      vnaFactor,
      custodyConfig: { custMode: 'single', cust1: 0.50 }
    });

    expect(beRate).not.toBeNull();
    // A taxa de empate hoje fica bem acima da taxa atual (~6,55%), demonstrando a margem de segurança da carteira
    expect(beRate).toBeGreaterThan(0.0655);
  });

  it('gera a tabela de sensibilidade com variações coerentes com a duration', () => {
    const lots = [
      { date: '2026-01-23', rate: 6.99, price: 185.02, qty: 25.35 },
      { date: '2026-03-24', rate: 7.14, price: 177.03, qty: 56.48 },
      { date: '2026-06-08', rate: 7.27, price: 172.89, qty: 28.92 },
      { date: '2026-07-30', rate: 7.37, price: 168.02, qty: 29.58 }
    ];
    const cal = calibrateModel({ refDate: '2026-10-05', refPrice: 243.38, lots });
    const vnaFactor = getVNAFactor(cal.refDN, cal.refDN, cal.Fref, 4.5);

    const table = calcSensitivityTable({
      refDN: cal.refDN,
      rNow: cal.rNow,
      pNow: cal.pNow,
      vnaFactor,
      lots,
      shocks: [-1.0, 1.0]
    });

    expect(table).toHaveLength(2);

    // Queda de 1 p.p. na taxa: PU sobe expressivamente, lucro bruto sobe
    const shockDown = table[0];
    expect(shockDown.shock).toBe(-1.0);
    expect(shockDown.newPU).toBeGreaterThan(cal.pNow);
    expect(shockDown.brutoDiff).toBeGreaterThan(0);
    expect(shockDown.puVarPct).toBeGreaterThan(0.15); // > 15% de alta devido à alta duration

    // Alta de 1 p.p. na taxa: PU cai expressivamente, variação de saldo negativa
    const shockUp = table[1];
    expect(shockUp.shock).toBe(1.0);
    expect(shockUp.newPU).toBeLessThan(cal.pNow);
    expect(shockUp.brutoDiff).toBeLessThan(0);
  });
});
