/**
 * Componente: KPI Card
 * Exibe título, valor em destaque com tipografia tabular e subtítulo explicativo.
 */

export function renderKpiCard({ label, value, sub = '', valClass = '', tooltip = '' }) {
  return `
    <div class="kpi-card">
      <div class="kpi-label">
        <span>${label}</span>
      </div>
      <div class="kpi-value ${valClass}">${value}</div>
      ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
    </div>
  `;
}
