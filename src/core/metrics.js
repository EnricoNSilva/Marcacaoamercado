/**
 * Motor Financeiro - Módulo de Métricas de Rentabilidade & Análise de Risco
 * TIR (XIRR), retorno real, taxa de empate, sensibilidade e duration.
 */

import { trunc2, calcPU } from './bond.js';
import { simulateSellPEPS } from './portfolio.js';

/**
 * Rentabilidade percentual simples.
 * @param {number} value
 * @param {number} cost
 * @returns {number}
 */
export function calcReturnPct(value, cost) {
  if (!cost || cost <= 0) return 0;
  return (value - cost) / cost;
}

/**
 * Retorno real expurgando a inflação (equação de Fisher).
 * @param {number} nominalReturn - Retorno nominal em decimal (ex: 0.3037)
 * @param {number} inflation - Inflação acumulada em decimal (ex: 0.045)
 * @returns {number} Retorno real em decimal
 */
export function calcRealReturn(nominalReturn, inflation) {
  if (inflation <= -1) return nominalReturn;
  return ((1 + nominalReturn) / (1 + inflation)) - 1;
}

/**
 * Calcula a Taxa Interna de Retorno anualizada (TIR / XIRR) para fluxos irregulares.
 * @param {Array<{ dn: number, amount: number }>} cashFlows - Fluxos de caixa (compras negativas, resgate positivo)
 * @param {number} [guess=0.10] - Palpite inicial
 * @returns {number} TIR anualizada em decimal (ex: 0.12 para 12% a.a.)
 */
export function calcXIRR(cashFlows, guess = 0.10) {
  if (!cashFlows || cashFlows.length < 2) return 0;

  const validFlows = cashFlows.filter(f => f.amount !== 0 && !isNaN(f.amount));
  const hasPositive = validFlows.some(f => f.amount > 0);
  const hasNegative = validFlows.some(f => f.amount < 0);
  if (!hasPositive || !hasNegative) return 0;

  const t0 = validFlows[0].dn;

  function npvAndDeriv(r) {
    let npv = 0;
    let dNpv = 0;
    for (const f of validFlows) {
      const dt = (f.dn - t0) / 365.25;
      const factor = Math.pow(1 + r, dt);
      npv += f.amount / factor;
      if (dt !== 0) {
        dNpv -= (dt * f.amount) / (factor * (1 + r));
      }
    }
    return { npv, dNpv };
  }

  // Método de Newton-Raphson com restrição de intervalo
  let r = guess;
  for (let i = 0; i < 50; i++) {
    if (r <= -0.999) r = -0.99;
    const { npv, dNpv } = npvAndDeriv(r);
    if (Math.abs(npv) < 1e-5) return r;
    if (Math.abs(dNpv) < 1e-9) break;
    const nextR = r - npv / dNpv;
    if (Math.abs(nextR - r) < 1e-6) return nextR;
    r = nextR;
  }

  // Fallback: Busca binária (bisseção) caso Newton não convirja
  let lo = -0.99;
  let hi = 5.0;
  let npvLo = npvAndDeriv(lo).npv;

  for (let j = 0; j < 60; j++) {
    const mid = (lo + hi) / 2;
    const { npv: npvMid } = npvAndDeriv(mid);
    if (Math.abs(npvMid) < 1e-5) return mid;
    if ((npvLo > 0 && npvMid > 0) || (npvLo < 0 && npvMid < 0)) {
      lo = mid;
      npvLo = npvMid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

/**
 * Calcula a Taxa de Empate (breakeven rate) para uma data futura:
 * taxa em que o saldo líquido final empata exatamente com o capital total investido.
 * @param {Object} params
 * @param {Array<Object>} params.lots
 * @param {number} params.simDN
 * @param {number} params.vnaFactor
 * @param {Object} [params.custodyConfig]
 * @returns {number|null} Taxa de empate em decimal (ou null se não encontrada)
 */
export function calcBreakevenRate({ lots, simDN, vnaFactor, custodyConfig = {} }) {
  const totalCost = lots.reduce((acc, l) => acc + trunc2(l.qty * l.price), 0);
  if (totalCost <= 0) return null;

  let lo = -0.05;
  let hi = 0.35;

  const resLo = simulateSellPEPS({ lots, t: simDN, r: lo, vnaFactor, custodyConfig });
  const resHi = simulateSellPEPS({ lots, t: simDN, r: hi, vnaFactor, custodyConfig });

  if (resLo.liqReal < totalCost) return null; // Já dá prejuízo mesmo na menor taxa
  if (resHi.liqReal > totalCost) return hi;   // Dá lucro mesmo com taxa de 35%

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const resMid = simulateSellPEPS({ lots, t: simDN, r: mid, vnaFactor, custodyConfig });
    const diff = resMid.liqReal - totalCost;

    if (Math.abs(diff) < 0.5) return mid;
    if (diff > 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

/**
 * Gera a tabela de sensibilidade a choques instantâneos de taxa de juros na data de referência.
 * @param {Object} params
 * @param {number} params.refDN
 * @param {number} params.rNow
 * @param {number} params.pNow
 * @param {number} params.vnaFactor
 * @param {Array<Object>} params.lots
 * @param {Array<number>} [params.shocks] - Variações de taxa em p.p. (ex: [-1.0, -0.5, 0.5, 1.0])
 * @param {Object} [params.custodyConfig]
 * @returns {Array<Object>}
 */
export function calcSensitivityTable({
  refDN,
  rNow,
  pNow,
  vnaFactor,
  lots,
  shocks = [-1.0, -0.5, -0.25, -0.10, 0.10, 0.25, 0.50, 1.0],
  custodyConfig = {}
}) {
  const baseRes = simulateSellPEPS({
    lots,
    t: refDN,
    r: rNow,
    vnaFactor,
    custodyConfig,
    overridePU: pNow
  });

  return shocks.map(s => {
    const shockDec = s / 100;
    const newRate = rNow + shockDec;
    const newPU = calcPU(refDN, newRate, vnaFactor);
    const shockRes = simulateSellPEPS({
      lots,
      t: refDN,
      r: newRate,
      vnaFactor,
      custodyConfig,
      overridePU: newPU
    });

    const brutoDiff = shockRes.bruto - baseRes.bruto;
    const liqDiff = shockRes.liqApp - baseRes.liqApp;
    const puVarPct = (newPU - pNow) / pNow;
    const liqReturnPct = calcReturnPct(shockRes.liqApp, shockRes.custo);

    return {
      shock: s,
      newRate,
      newPU,
      bruto: shockRes.bruto,
      brutoDiff,
      liqApp: shockRes.liqApp,
      liqDiff,
      puVarPct,
      liqReturnPct
    };
  });
}
