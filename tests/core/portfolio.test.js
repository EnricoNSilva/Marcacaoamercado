import { describe, it, expect } from 'vitest';
import { toDayNum } from '../../src/core/dates.js';
import { calibrateModel, getVNAFactor } from '../../src/core/calibration.js';
import { simulateSellPEPS, decomposeCarryAndMtM } from '../../src/core/portfolio.js';
import { calcReturnPct } from '../../src/core/metrics.js';

describe('Motor Financeiro: Carteira & Valores-Ouro do Tesouro Direto', () => {
  const USER_LOTS = [
    { date: '2026-01-23', rate: 6.99, price: 185.02, qty: 25.35 },
    { date: '2026-03-24', rate: 7.14, price: 177.03, qty: 56.48 },
    { date: '2026-06-08', rate: 7.27, price: 172.89, qty: 28.92 },
    { date: '2026-07-30', rate: 7.37, price: 168.02, qty: 29.58 }
  ];

  const REF_DATE = '2026-10-05';
  const REF_PRICE = 243.38;

  it('calibra o modelo com precisão a partir do PU real de resgate (R$ 243,38)', () => {
    const calibrated = calibrateModel({
      refDate: REF_DATE,
      refPrice: REF_PRICE,
      lots: USER_LOTS,
      ipcaCal: 4.5
    });

    expect(calibrated.refDN).toBe(toDayNum(REF_DATE));
    expect(calibrated.pNow).toBe(REF_PRICE);

    // Taxa implícita de resgate calibrada deve ficar em torno de 6,55% (IPCA + 6,55%)
    const ratePct = calibrated.rNow * 100;
    expect(ratePct).toBeGreaterThan(6.50);
    expect(ratePct).toBeLessThan(6.60);
  });

  it('bate centavo a centavo os valores oficiais da carteira no App do Tesouro', () => {
    const calibrated = calibrateModel({
      refDate: REF_DATE,
      refPrice: REF_PRICE,
      lots: USER_LOTS,
      ipcaCal: 4.5
    });

    const vnaFactor = getVNAFactor(calibrated.refDN, calibrated.refDN, calibrated.Fref, 4.5);

    const res = simulateSellPEPS({
      lots: USER_LOTS,
      t: calibrated.refDN,
      r: calibrated.rNow,
      vnaFactor,
      overridePU: calibrated.pNow,
      custodyConfig: { custMode: 'single', cust1: 0.50 }
    });

    // 1. Quantidade total de títulos: 140,33
    expect(res.q).toBeCloseTo(140.33, 2);

    // 2. Custo total investido: R$ 24.658,90
    expect(res.custo).toBeCloseTo(24658.90, 2);

    // 3. Saldo bruto apurado (soma dos truncamentos dos 4 lotes a PU 243,38): R$ 34.153,40 a 34.153,50
    expect(res.bruto).toBeGreaterThanOrEqual(34153.40);
    expect(res.bruto).toBeLessThanOrEqual(34153.52);

    // 4. IR App Retido: ~R$ 2.005,58 / 2.005,59 (tolerância documentada de 1 centavo por lote)
    expect(Math.abs(res.irApp - 2005.58)).toBeLessThanOrEqual(0.02);

    // 5. Saldo Líquido do App Oficial: ~R$ 32.147,91 / 32.147,92
    expect(Math.abs(res.liqApp - 32147.92)).toBeLessThanOrEqual(0.02);

    // 6. Rentabilidade Líquida no App: +30,37% (R$ 7.489,01 de lucro sobre R$ 24.658,90)
    const retPct = calcReturnPct(res.liqApp, res.custo);
    expect(retPct).toBeCloseTo(0.3037, 3);

    // 7. Custódia B3 pro rata retida na venda antecipada: R$ 76,33
    expect(res.cust).toBeCloseTo(76.33, 1);

    // 8. Líquido Real após custódia B3: R$ 32.087,30
    expect(res.liqReal).toBeCloseTo(32087.30, 1);
  });

  it('executa a liquidação parcial estritamente em ordem PEPS (FIFO)', () => {
    const calibrated = calibrateModel({
      refDate: REF_DATE,
      refPrice: REF_PRICE,
      lots: USER_LOTS,
      ipcaCal: 4.5
    });

    const vnaFactor = getVNAFactor(calibrated.refDN, calibrated.refDN, calibrated.Fref, 4.5);

    // Simula venda de apenas 50 títulos (primeiro lote tem 25.35, segundo lote tem 56.48)
    const partialRes = simulateSellPEPS({
      lots: USER_LOTS,
      t: calibrated.refDN,
      r: calibrated.rNow,
      vnaFactor,
      qtyToSell: 50,
      overridePU: calibrated.pNow
    });

    expect(partialRes.q).toBe(50);
    expect(partialRes.parts).toHaveLength(2);

    // Primeiro lote deve ser vendido integralmente (25.35)
    expect(partialRes.parts[0].q).toBe(25.35);
    expect(partialRes.parts[0].lot.date).toBe('2026-01-23');

    // Segundo lote deve fornecer o restante (50 - 25.35 = 24.65)
    expect(partialRes.parts[1].q).toBe(24.65);
    expect(partialRes.parts[1].lot.date).toBe('2026-03-24');
  });

  it('decompõe corretamente o ganho entre Carrego Puro e Marcação a Mercado', () => {
    const calibrated = calibrateModel({
      refDate: REF_DATE,
      refPrice: REF_PRICE,
      lots: USER_LOTS,
      ipcaCal: 4.5
    });

    const vnaFactor = getVNAFactor(calibrated.refDN, calibrated.refDN, calibrated.Fref, 4.5);

    const simRes = simulateSellPEPS({
      lots: USER_LOTS,
      t: calibrated.refDN,
      r: calibrated.rNow,
      vnaFactor,
      overridePU: calibrated.pNow
    });

    const decomp = decomposeCarryAndMtM({
      simRes,
      simDN: calibrated.refDN,
      vnaFactor
    });

    // A soma do carrego e marcação deve ser exatamente o ganho bruto total
    expect(decomp.ganhoCarrego + decomp.ganhoMarcacao).toBeCloseTo(decomp.ganhoBrutoTotal, 2);
    expect(decomp.pctCarrego + decomp.pctMarcacao).toBeCloseTo(1.0, 5);
  });
});
