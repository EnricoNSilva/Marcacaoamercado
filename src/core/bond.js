/**
 * Motor Financeiro - Módulo de Título (NTN-B1 RENDA+ 2065)
 * Fluxo de 240 parcelas mensais, fator de anuidade, PU e duration.
 */

import { toDayNum } from './dates.js';
import { getBusDays, nextBusDay } from './calendar.js';

export const TRUNC_EPS = 1e-6;

/**
 * Trunca valor monetário em 2 casas decimais (padrão de liquidação do Tesouro Direto).
 * @param {number} x
 * @returns {number}
 */
export function trunc2(x) {
  return Math.floor((Number(x) || 0) * 100 + TRUNC_EPS) / 100;
}

// 240 fluxos de amortização do RENDA+ 2065 (15 de cada mês, 01/2065 a 12/2084)
export const CASH_FLOWS = [];
for (let k = 0; k < 240; k++) {
  const year = 2065 + Math.floor(k / 12);
  const month = (k % 12) + 1;
  const rawDN = toDayNum(`${year}-${String(month).padStart(2, '0')}-15`);
  CASH_FLOWS.push(nextBusDay(rawDN));
}

export const FIRST_FLOW = CASH_FLOWS[0];
export const LAST_FLOW = CASH_FLOWS[CASH_FLOWS.length - 1];
export const FLOW_OFFSETS = CASH_FLOWS.map(f => getBusDays(FIRST_FLOW, f));
export const MAX_SIM_DATE = FIRST_FLOW - 1;

// Cache simples para a soma dos fluxos descontados a partir do primeiro fluxo
const flowSumCache = new Map();

function getDiscountedFlowsSum(r) {
  const key = Math.round(r * 1e7);
  if (flowSumCache.has(key)) {
    return flowSumCache.get(key);
  }
  let sum = 0;
  const base = 1 + r;
  for (let i = 0; i < 240; i++) {
    sum += Math.pow(base, -FLOW_OFFSETS[i] / 252);
  }
  if (flowSumCache.size > 2000) {
    flowSumCache.clear();
  }
  flowSumCache.set(key, sum);
  return sum;
}

/**
 * Calcula o fator de anuidade na data t (em dias numéricos) com taxa anual r.
 * Representa a soma dos fatores de desconto de todos os 240 fluxos trazidos a valor presente na data t.
 * @param {number} t - Data em dia número UTC
 * @param {number} r - Taxa real anual em decimal (ex: 0.0655 para 6.55%)
 * @returns {number}
 */
export function calcAnnuityFactor(t, r) {
  const duToFirst = getBusDays(t, FIRST_FLOW);
  const baseDiscount = Math.pow(1 + r, -duToFirst / 252);
  const sumFlows = getDiscountedFlowsSum(r);
  return baseDiscount * sumFlows;
}

/**
 * Calcula o Preço Unitário (PU) teórico a partir do fator de VNA e fator de anuidade.
 * @param {number} t - Data de liquidação
 * @param {number} r - Taxa anual real
 * @param {number} vnaFactor - Fator F(t) proporcional ao VNA
 * @returns {number} PU truncado em 2 casas
 */
export function calcPU(t, r, vnaFactor) {
  return trunc2(vnaFactor * calcAnnuityFactor(t, r));
}

/**
 * Calcula a Duration Modificada numérica do título (em anos).
 * @param {number} t - Data
 * @param {number} r - Taxa
 * @param {number} [eps=1e-4]
 * @returns {number}
 */
export function calcModifiedDuration(t, r, eps = 1e-4) {
  const aPlus = calcAnnuityFactor(t, r + eps);
  const aMinus = calcAnnuityFactor(t, r - eps);
  return -(Math.log(aPlus) - Math.log(aMinus)) / (2 * eps);
}
