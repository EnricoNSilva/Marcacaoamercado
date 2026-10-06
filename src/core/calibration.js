/**
 * Motor Financeiro - Módulo de Calibração de Mercado e VNA
 * Estima a taxa implícita hoje (rNow) a partir do PU de resgate e calcula a evolução do VNA.
 */

import { toDayNum } from './dates.js';
import { getBusDays } from './calendar.js';
import { calcAnnuityFactor } from './bond.js';

/**
 * Calibra o modelo de precificação do título.
 * @param {Object} params
 * @param {string|number} params.refDate - Data de referência ('AAAA-MM-DD' ou dia numérico)
 * @param {number} params.refPrice - Preço Unitário de Resgate hoje (ex: 243.38)
 * @param {number|string} [params.refRate] - Taxa de resgate informada manualmente (% a.a.) ou vazia para auto-inferir
 * @param {Array<Object>} params.lots - Lista de lotes comprados [{ date, rate, price, qty }]
 * @param {number} [params.ipcaCal=4.5] - IPCA anual estimado entre a última compra e a data de referência (% a.a.)
 * @returns {{ refDN: number, rNow: number, Fref: number, pNow: number }}
 */
export function calibrateModel({
  refDate,
  refPrice,
  refRate = '',
  lots = [],
  ipcaCal = 4.5
}) {
  const refDN = typeof refDate === 'number' ? refDate : toDayNum(refDate);
  const pNow = Number(refPrice) || 243.38;
  let rNow;

  if (refRate !== '' && refRate !== null && !isNaN(Number(refRate))) {
    rNow = Number(refRate) / 100;
  } else if (lots && lots.length > 0) {
    const anchor = lots[lots.length - 1];
    const anchorDN = typeof anchor.dn === 'number' ? anchor.dn : toDayNum(anchor.date);
    const anchorRate = (Number(anchor.rate) || 0) / 100;
    const anchorPrice = Number(anchor.price) || 0;
    const calIpcaDec = (Number(ipcaCal) || 4.5) / 100;
    const busDaysFromAnchor = getBusDays(anchorDN, refDN);

    const anchorF = (anchorPrice / calcAnnuityFactor(anchorDN, anchorRate)) *
                    Math.pow(1 + calIpcaDec, busDaysFromAnchor / 252);

    let lo = -0.05;
    let hi = 0.35;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (anchorF * calcAnnuityFactor(refDN, mid) > pNow) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    rNow = (lo + hi) / 2;
  } else {
    rNow = 0.0655;
  }

  const Fref = pNow / calcAnnuityFactor(refDN, rNow);

  return {
    refDN,
    rNow,
    Fref,
    pNow
  };
}

/**
 * Retorna o fator de VNA na data t a partir da data de referência e IPCA anual projetado.
 * @param {number} t - Data alvo em dia numérico
 * @param {number} refDN - Data de referência calibrada
 * @param {number} Fref - Fator de escala base F(refDN)
 * @param {number} projectedIpcaPct - IPCA anual projetado (% a.a.)
 * @returns {number}
 */
export function getVNAFactor(t, refDN, Fref, projectedIpcaPct = 4.5) {
  const ipca = (Number(projectedIpcaPct) || 0) / 100;
  if (t >= refDN) {
    const du = getBusDays(refDN, t);
    return Fref * Math.pow(1 + ipca, du / 252);
  } else {
    const du = getBusDays(t, refDN);
    return Fref / Math.pow(1 + ipca, du / 252);
  }
}
