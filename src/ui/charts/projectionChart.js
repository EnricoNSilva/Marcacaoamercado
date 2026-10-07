/**
 * Gráfico: Curvas de Projeção Financeira e Marcação a Mercado
 */

import {
  addYearsDN,
  getVNAFactor,
  calcPU,
  simulateSellPEPS,
  MAX_SIM_DATE,
  trunc2,
} from "../../core/index.js";
import { fmtBRL, fmtPct } from "../format.js";
import { CHART_COLORS } from "./theme.js";

let mainChartInstance = null;

export function renderProjectionChart(canvasId, state, computed) {
  const canvas =
    typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId;
  if (!canvas || typeof Chart === "undefined") return;

  const { refDN, Fref, custodyConfig } = computed;
  const horizonYears = Math.min(
    Math.max(Number(state.chartHorizonYears) || 10, 3),
    35,
  );

  const points = [];
  const labels = [];
  const yearSteps = [];

  for (let y = 0; y <= horizonYears; y += 0.5) {
    const d = Math.min(addYearsDN(refDN, y), MAX_SIM_DATE);
    points.push(d);
    yearSteps.push(y);
    labels.push(y === 0 ? "Hoje" : `${y}a`);
  }

  const isReal = state.chartReal === "real";

  function getDeflator(d) {
    if (!isReal) return 1.0;
    return getVNAFactor(d, refDN, 1.0, state.ipca);
  }

  function getValueAt(d, rateAnnual, isCarry = false) {
    const vna = getVNAFactor(d, refDN, Fref, state.ipca);
    const deflator = getDeflator(d);

    if (isCarry) {
      let tot = 0;
      for (const l of state.lots) {
        const lotRateDec = (Number(l.rate) || 0) / 100;
        tot += trunc2(l.qty * calcPU(d, lotRateDec, vna));
      }
      return tot / deflator;
    }

    const res = simulateSellPEPS({
      lots: state.lots,
      t: d,
      r: rateAnnual,
      vnaFactor: vna,
      custodyConfig,
    });

    const val = state.chartMetric === "bruto" ? res.bruto : res.liqReal;
    return val / deflator;
  }

  // Benchmark: Curva de Rendimento Alternativo a 100% do CDI
  const posLiqToday = computed.posRes?.liqReal || computed.posRes?.custo || 1000;
  const cdiAnnualRate = (Number(state.cdiRate) || Number(state.selic) || 10.75) / 100;

  function getCdiValueAt(y, d) {
    const deflator = getDeflator(d);
    if (y === 0) return posLiqToday / deflator;

    const days = y * 365.25;
    const grossVal = posLiqToday * Math.pow(1 + cdiAnnualRate, y);
    if (state.chartMetric === "bruto") {
      return grossVal / deflator;
    }
    const gain = Math.max(0, grossVal - posLiqToday);
    const irRate = days <= 180 ? 0.225 : days <= 360 ? 0.20 : days <= 720 ? 0.175 : 0.15;
    const netVal = posLiqToday + gain * (1 - irRate);
    return netVal / deflator;
  }

  const targetRateDec = (Number(state.targetRate) || 0) / 100;

  const datasets = [
    {
      label: `Cenário Alvo (IPCA + ${fmtPct(targetRateDec)})`,
      data: points.map((d) => getValueAt(d, targetRateDec)),
      borderColor: CHART_COLORS.primary,
      borderWidth: 3,
      pointRadius: 0,
    },
    {
      label: "Carrego Puro (Taxa de Compra)",
      data: points.map((d) => getValueAt(d, 0, true)),
      borderColor: CHART_COLORS.whiteDashed,
      borderDash: [5, 4],
      borderWidth: 2,
      pointRadius: 0,
    },
    {
      label: `Benchmark 100% CDI (${fmtPct(cdiAnnualRate)})`,
      data: points.map((d, i) => getCdiValueAt(yearSteps[i], d)),
      borderColor: "#c084fc",
      borderDash: [3, 3],
      borderWidth: 2,
      pointRadius: 0,
    },
    {
      label: "Queda de Juros (IPCA + 5,0%)",
      data: points.map((d) => getValueAt(d, 0.05)),
      borderColor: CHART_COLORS.success,
      borderWidth: 1.5,
      pointRadius: 0,
    },
    {
      label: "Estresse / Alta (IPCA + 8,0%)",
      data: points.map((d) => getValueAt(d, 0.08)),
      borderColor: CHART_COLORS.danger,
      borderWidth: 1.5,
      pointRadius: 0,
    },
  ];

  if (mainChartInstance) {
    mainChartInstance.destroy();
  }

  mainChartInstance = new Chart(canvas, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          labels: { color: CHART_COLORS.textSecondary, font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: (c) => `${c.dataset.label}: ${fmtBRL(c.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: CHART_COLORS.textMuted },
          grid: { color: CHART_COLORS.borderGrid },
        },
        y: {
          ticks: {
            color: CHART_COLORS.textMuted,
            callback: (v) =>
              "R$ " + (v / 1000).toLocaleString("pt-BR") + " mil",
          },
          grid: { color: CHART_COLORS.borderGrid },
        },
      },
    },
  });
}
