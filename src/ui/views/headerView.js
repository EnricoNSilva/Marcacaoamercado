/**
 * View: Header e Resumo Rápido Superior
 * Exibe Saldo Líquido, Taxa Hoje e a Nova Métrica de Rentabilidade da Carteira.
 */

import { fmtBRL, fmtPct } from '../format.js';

export function createHeaderView(store) {
  const topLiqAppEl = document.getElementById('topLiqApp');
  const topRateNowEl = document.getElementById('topRateNow');
  const topReturnNowEl = document.getElementById('topReturnNow');
  const topTirNowEl = document.getElementById('topTirNow');

  function render(state, computed) {
    const { posRes, rNow, posReturnPct, posTIR } = computed;

    if (topLiqAppEl) {
      topLiqAppEl.textContent = fmtBRL(posRes.liqApp);
    }

    if (topRateNowEl) {
      topRateNowEl.textContent = `IPCA + ${fmtPct(rNow)}`;
    }

    if (topReturnNowEl) {
      const sign = posReturnPct >= 0 ? '+' : '';
      topReturnNowEl.textContent = `${sign}${fmtPct(posReturnPct)}`;
      topReturnNowEl.className = posReturnPct >= 0 ? 'pos' : 'neg';
    }

    if (topTirNowEl) {
      topTirNowEl.textContent = `TIR ≈ ${fmtPct(posTIR)} a.a.`;
    }
  }

  return { render };
}
