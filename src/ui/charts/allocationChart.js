/**
 * Gráfico de Rosca (Donut Chart): Alocação e Diversificação da Carteira
 * Agrupamento por indexador (IPCA+, Selic, Prefixado) e por lote de investimento.
 */

import { fmtBRL, fmtPct } from '../format.js';
import { CHART_COLORS } from './theme.js';

let allocationChartInstance = null;

const ALLOCATION_PALETTE = {
  ipca: '#3b82f6',       // Azul
  selic: '#10b981',      // Verde
  prefixado: '#f59e0b',  // Âmbar / Laranja
  lots: [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308', '#6366f1'
  ]
};

export function renderAllocationChart(canvasId, state, computed, mode = 'indexer') {
  const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
  if (!canvas || typeof Chart === 'undefined') return;

  const { posRes } = computed;
  const parts = posRes.parts || [];
  const totalLiq = posRes.liqApp > 0 ? posRes.liqApp : 0;

  let labels = [];
  let data = [];
  let bgColors = [];

  if (mode === 'indexer') {
    // 1. Agrupamento por Indexador (IPCA+, Selic, Prefixado)
    let ipcaSum = 0;
    let selicSum = 0;
    let preSum = 0;

    parts.forEach(p => {
      const idx = (p.lot.indexer || '').toLowerCase();
      const bondName = (p.lot.title || state.selectedBond || '').toLowerCase();

      if (idx === 'selic' || bondName.includes('selic')) {
        selicSum += p.liqApp;
      } else if (idx === 'prefixado' || bondName.includes('prefixado')) {
        preSum += p.liqApp;
      } else {
        ipcaSum += p.liqApp;
      }
    });

    labels = ['IPCA+ / Renda+', 'Tesouro Selic', 'Tesouro Prefixado'];
    data = [Math.max(0, ipcaSum), Math.max(0, selicSum), Math.max(0, preSum)];
    bgColors = [ALLOCATION_PALETTE.ipca, ALLOCATION_PALETTE.selic, ALLOCATION_PALETTE.prefixado];

    // Se a carteira estiver vazia
    if (data.every(v => v === 0)) {
      labels = ['Sem Ativos'];
      data = [1];
      bgColors = [CHART_COLORS.textMuted];
    }
  } else {
    // 2. Agrupamento por Lote Individual
    if (parts.length === 0) {
      labels = ['Sem Ativos'];
      data = [1];
      bgColors = [CHART_COLORS.textMuted];
    } else {
      parts.forEach((p, i) => {
        const lotNum = parts.length - i;
        labels.push(`Lote ${lotNum} (${p.lot.date})`);
        data.push(Math.max(0, p.liqApp));
        bgColors.push(ALLOCATION_PALETTE.lots[i % ALLOCATION_PALETTE.lots.length]);
      });
    }
  }

  if (allocationChartInstance) {
    allocationChartInstance.destroy();
  }

  allocationChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: 'var(--bg-card, #0f172a)',
          hoverOffset: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: CHART_COLORS.textSecondary,
            font: { size: 12 },
            padding: 12,
            boxWidth: 12,
            boxHeight: 12
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed;
              const pct = totalLiq > 0 ? (val / totalLiq) : 0;
              return ` ${ctx.label}: ${fmtBRL(val)} (${fmtPct(pct)})`;
            }
          }
        }
      }
    }
  });

  return allocationChartInstance;
}

