/**
 * Gráfico: Trajetória e Convergência da Taxa de Mercado
 * Exibe a curva de convergência com range dinâmico inteligente no eixo Y,
 * evitando distorções visuais quando a taxa projetada for próxima da taxa atual.
 */

import { generateRateTrajectory } from '../../core/index.js';
import { CHART_COLORS } from './theme.js';

let trajectoryChartInstance = null;

export function renderRateTrajectoryChart(canvasId, state, computed) {
  const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
  if (!canvas || typeof Chart === 'undefined') return;

  const { rNow } = computed;
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

  // Calcula amplitude inteligente para o eixo Y
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const spreadRange = maxVal - minVal;

  // Garante amplitude visual mínima de 2,0 p.p. para não distorcer variações microscópicas
  const desiredSpan = Math.max(spreadRange * 1.3, 2.0);
  const mid = (minVal + maxVal) / 2;

  let yMin = Math.max(0, Math.floor((mid - desiredSpan / 2) * 2) / 2);
  let yMax = Math.ceil((mid + desiredSpan / 2) * 2) / 2;

  if (yMax - yMin < 1.5) {
    yMax = yMin + 2.0;
  }

  const stepSize = (yMax - yMin) <= 3.0 ? 0.5 : 1.0;

  if (trajectoryChartInstance) {
    trajectoryChartInstance.destroy();
  }

  trajectoryChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Taxa Projetada',
          data,
          borderColor: CHART_COLORS.primary,
          backgroundColor: CHART_COLORS.primaryBg,
          fill: true,
          tension: 0.15,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `Taxa: IPCA + ${ctx.parsed.y.toFixed(2).replace('.', ',')}% a.a.`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: CHART_COLORS.textMuted, maxTicksLimit: 8 },
          grid: { display: false }
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: {
            color: CHART_COLORS.textMuted,
            stepSize,
            callback: v => v.toFixed(2).replace('.', ',') + '%'
          },
          grid: { color: CHART_COLORS.borderGrid }
        }
      }
    }
  });
}
