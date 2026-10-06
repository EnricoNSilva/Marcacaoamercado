/**
 * Gráfico: Trajetória e Convergência da Taxa de Mercado
 */

import { generateRateTrajectory } from '../../core/index.js';
import { CHART_COLORS } from './theme.js';

let trajectoryChartInstance = null;

export function renderRateTrajectoryChart(canvasId, state, computed) {
  const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
  if (!canvas || typeof Chart === 'undefined') return;

  const { rNow, rateAtSale } = computed;
  const horizonMonths = Math.max(state.convMonths + 12, Math.ceil(state.simYears * 12) + 6, 24);

  const trajectory = generateRateTrajectory({
    rNow,
    targetRatePct: state.targetRate,
    convMonths: state.convMonths,
    spread: state.spread,
    horizonMonths,
    stepMonths: 2
  });

  const labels = trajectory.map(p => p.label);
  const data = trajectory.map(p => p.ratePct);

  if (trajectoryChartInstance) {
    trajectoryChartInstance.destroy();
  }

  trajectoryChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Taxa Projetada',
        data,
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.primaryBg,
        fill: true,
        tension: 0.15,
        borderWidth: 2,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: CHART_COLORS.textMuted, maxTicksLimit: 8 },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: CHART_COLORS.textMuted,
            callback: v => v.toFixed(2) + '%'
          },
          grid: { color: CHART_COLORS.borderGrid }
        }
      }
    }
  });
}
