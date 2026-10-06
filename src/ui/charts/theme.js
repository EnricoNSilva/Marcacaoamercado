/**
 * Configuração e Tema Visual dos Gráficos (Chart.js)
 */

export const CHART_COLORS = {
  primary: '#3b82f6',
  primaryBg: 'rgba(59, 130, 246, 0.12)',
  success: '#10b981',
  danger: '#ef4444',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  borderGrid: '#1e2c47',
  whiteDashed: '#ffffff'
};

export const COMMON_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      labels: {
        color: CHART_COLORS.textSecondary,
        font: { size: 12 }
      }
    }
  },
  scales: {
    x: {
      ticks: { color: CHART_COLORS.textMuted },
      grid: { display: false }
    },
    y: {
      ticks: { color: CHART_COLORS.textMuted },
      grid: { color: CHART_COLORS.borderGrid }
    }
  }
};
