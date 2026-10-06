/**
 * Motor Financeiro - Módulo de Carteira & Liquidação PEPS (FIFO)
 * Simula a venda total ou parcial de títulos respeitando a ordem cronológica de aquisição.
 */

import { toDayNum } from './dates.js';
import { trunc2, calcPU } from './bond.js';
import { calcCustodyFee, calcIOF, getIRRate } from './taxes.js';

/**
 * Simula a venda de títulos por liquidação PEPS (Primeiro que Entra, Primeiro que Sai).
 * @param {Object} params
 * @param {Array<Object>} params.lots - Lista de lotes [{ id, date, rate, price, qty }]
 * @param {number} params.t - Data de liquidação em dia numérico UTC
 * @param {number} params.r - Taxa de resgate em decimal (ex: 0.0655)
 * @param {number} params.vnaFactor - Fator de escala do VNA na data t
 * @param {number} [params.qtyToSell=Infinity] - Quantidade máxima a vender (venda parcial ou total)
 * @param {Object} [params.custodyConfig] - Configurações da taxa de custódia B3
 * @param {number} [params.overridePU] - PU explícito a usar (opcional, ex: no dia de calibração)
 * @returns {Object} Detalhamento por lote e totais consolidados
 */
export function simulateSellPEPS({
  lots = [],
  t,
  r,
  vnaFactor,
  qtyToSell = Infinity,
  custodyConfig = {},
  overridePU = null
}) {
  const pu = overridePU !== null && !isNaN(Number(overridePU))
    ? Number(overridePU)
    : calcPU(t, r, vnaFactor);

  const activeLots = (lots || [])
    .map(lot => ({
      ...lot,
      dn: typeof lot.dn === 'number' ? lot.dn : toDayNum(lot.date)
    }))
    .filter(lot => lot.dn <= t)
    .sort((a, b) => a.dn - b.dn);

  let left = Number(qtyToSell) > 0 ? Number(qtyToSell) : Infinity;
  const parts = [];

  for (const lot of activeLots) {
    if (left <= 1e-9) break;

    const q = Math.min(lot.qty, left);
    left -= q;

    const bruto = trunc2(q * pu);
    const custo = trunc2(q * lot.price);
    const days = Math.max(0, t - lot.dn);
    const cust = calcCustodyFee(bruto, days, custodyConfig);
    const ganho = bruto - custo - cust;
    const iof = calcIOF(ganho, days);
    const baseIR = Math.max(ganho - iof, 0);
    const irAliq = getIRRate(days);
    const ir = trunc2(baseIR * irAliq);

    // Cálculo estilo App oficial do Tesouro (IR apurado sem abater a taxa de custódia)
    const ganhoApp = Math.max(bruto - custo, 0);
    const irApp = trunc2(ganhoApp * irAliq);

    parts.push({
      lot,
      q,
      pu,
      bruto,
      custo,
      days,
      cust,
      iof,
      ir,
      irAliq,
      irApp,
      liqReal: bruto - cust - iof - ir,
      liqApp: bruto - iof - irApp
    });
  }

  const sum = key => parts.reduce((acc, p) => acc + (p[key] || 0), 0);

  return {
    parts,
    pu,
    q: sum('q'),
    bruto: sum('bruto'),
    custo: sum('custo'),
    cust: sum('cust'),
    iof: sum('iof'),
    ir: sum('ir'),
    irApp: sum('irApp'),
    liqReal: sum('liqReal'),
    liqApp: sum('liqApp')
  };
}

/**
 * Decompõe o resultado financeiro da venda entre Carrego Puro e Marcação a Mercado.
 * @param {Object} params
 * @param {Object} params.simRes - Resultado retornado por simulateSellPEPS
 * @param {number} params.simDN - Data da venda
 * @param {number} params.vnaFactor - Fator VNA na data simDN
 * @returns {{ ganhoBrutoTotal: number, ganhoCarrego: number, ganhoMarcacao: number, pctCarrego: number, pctMarcacao: number }}
 */
export function decomposeCarryAndMtM({ simRes, simDN, vnaFactor }) {
  let ganhoCarrego = 0;

  for (const p of simRes.parts) {
    const lotRateDec = (Number(p.lot.rate) || 0) / 100;
    const puCarrego = calcPU(simDN, lotRateDec, vnaFactor);
    ganhoCarrego += (trunc2(p.q * puCarrego) - p.custo);
  }

  const ganhoBrutoTotal = simRes.bruto - simRes.custo;
  const ganhoMarcacao = ganhoBrutoTotal - ganhoCarrego;

  const pctCarrego = ganhoBrutoTotal !== 0 ? (ganhoCarrego / ganhoBrutoTotal) : 0;
  const pctMarcacao = ganhoBrutoTotal !== 0 ? (ganhoMarcacao / ganhoBrutoTotal) : 0;

  return {
    ganhoBrutoTotal,
    ganhoCarrego,
    ganhoMarcacao,
    pctCarrego,
    pctMarcacao
  };
}
