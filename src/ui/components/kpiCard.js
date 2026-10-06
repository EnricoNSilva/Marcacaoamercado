/**
 * Componente: KPI Card
 * Exibe título com ícone '?', valor em destaque com tipografia tabular e subtítulo explicativo.
 */

import { renderInfoTip } from './infoTip.js';

export function renderKpiCard({
  label,
  value,
  sub = '',
  valClass = '',
  tooltipKey = ''
}) {
  const tipHtml = tooltipKey ? renderInfoTip(tooltipKey) : '';

  return `
    <div class="kpi-card">
      <div class="kpi-label">
        <span>${label}</span>
        ${tipHtml}
      </div>
      <div class="kpi-value ${valClass}">${value}</div>
      ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
    </div>
  `;
}
