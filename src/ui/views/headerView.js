/**
 * View: Header e Resumo Rápido Superior
 */

import { fmtBRL, fmtPct } from '../format.js';

export function createHeaderView(store) {
  const topLiqAppEl = document.getElementById('topLiqApp');
  const topRateNowEl = document.getElementById('topRateNow');

  function render(state, computed) {
    if (topLiqAppEl) {
      topLiqAppEl.textContent = fmtBRL(computed.posRes.liqApp);
    }
    if (topRateNowEl) {
      topRateNowEl.textContent = `IPCA + ${fmtPct(computed.rNow)}`;
    }
  }

  return { render };
}
