/**
 * Motor Financeiro - Módulo de Cenários & Trajetória de Taxas
 * Modela a convergência gradual da taxa de mercado ao longo do tempo.
 */

/**
 * Calcula a taxa de resgate projetada na data simDN, considerando a convergência gradual e spread.
 * @param {Object} params
 * @param {number} params.refDN - Data inicial de calibração
 * @param {number} params.simDN - Data simulada da venda
 * @param {number} params.rNow - Taxa atual calibrada em decimal (ex: 0.0655)
 * @param {number} params.targetRatePct - Taxa alvo projetada em % a.a. (ex: 6.55)
 * @param {number} params.convMonths - Prazo de convergência em meses (0 = choque imediato)
 * @param {number} [params.spread=0] - Spread compra/venda em p.p. (ex: 0.05)
 * @returns {number} Taxa de venda em decimal
 */
export function calcRateAtSale({
  refDN,
  simDN,
  rNow,
  targetRatePct,
  convMonths,
  spread = 0
}) {
  const targetRateDec = (Number(targetRatePct) || 0) / 100;
  const spreadDec = (Number(spread) || 0) / 100;

  const daysElapsed = Math.max(0, simDN - refDN);
  const monthsElapsed = daysElapsed / 30.4375;

  const progress = Number(convMonths) <= 0
    ? 1
    : Math.min(1, Math.max(0, monthsElapsed / Number(convMonths)));

  return rNow + (targetRateDec - rNow) * progress + spreadDec;
}

/**
 * Gera pontos de trajetória da taxa mês a mês para plotagem em gráfico.
 * @param {Object} params
 * @param {number} params.rNow - Taxa inicial hoje em decimal
 * @param {number} params.targetRatePct - Taxa alvo em % a.a.
 * @param {number} params.convMonths - Meses até atingir a taxa alvo
 * @param {number} [params.spread=0] - Spread em p.p.
 * @param {number} [params.horizonMonths=36] - Horizonte máximo a exibir
 * @param {number} [params.stepMonths=2] - Intervalo entre pontos
 * @returns {Array<{ month: number, label: string, ratePct: number }>}
 */
export function generateRateTrajectory({
  rNow,
  targetRatePct,
  convMonths,
  spread = 0,
  horizonMonths = 36,
  stepMonths = 2
}) {
  const points = [];
  const targetRateDec = (Number(targetRatePct) || 0) / 100;
  const spreadDec = (Number(spread) || 0) / 100;

  for (let m = 0; m <= horizonMonths; m += stepMonths) {
    const progress = Number(convMonths) <= 0
      ? 1
      : Math.min(1, Math.max(0, m / Number(convMonths)));

    const r = rNow + (targetRateDec - rNow) * progress + spreadDec;

    points.push({
      month: m,
      label: m === 0 ? 'Hoje' : `Mês ${m}`,
      ratePct: r * 100
    });
  }

  return points;
}
