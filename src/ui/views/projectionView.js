/**
 * View: Projeção & Gráfico (Aba 3)
 * Gráficos comparativos de marcação a mercado e carrego puro.
 */

import { renderProjectionChart } from "../charts/projectionChart.js";

export function createProjectionView(store) {
  const chartMetricSelect = document.getElementById("chartMetricSelect");
  const chartRealSelect = document.getElementById("chartRealSelect");

  if (chartMetricSelect) {
    chartMetricSelect.addEventListener("change", (e) => {
      store.setState({ chartMetric: e.target.value });
    });
  }

  if (chartRealSelect) {
    chartRealSelect.addEventListener("change", (e) => {
      store.setState({ chartReal: e.target.value });
    });
  }

  function render(state, computed) {
    if (chartMetricSelect && chartMetricSelect.value !== state.chartMetric) {
      chartMetricSelect.value = state.chartMetric;
    }
    if (chartRealSelect && chartRealSelect.value !== state.chartReal) {
      chartRealSelect.value = state.chartReal;
    }

    renderProjectionChart("mainChart", state, computed);
  }

  return { render };
}
