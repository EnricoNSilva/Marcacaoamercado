import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderProjectionChart } from '../../src/ui/charts/projectionChart.js';

describe('UI: Gráfico de Projeções e Benchmark 100% CDI', () => {
  let mockChartInstance;
  let chartConfig;

  beforeEach(() => {
    chartConfig = null;
    mockChartInstance = {
      destroy: vi.fn()
    };
    globalThis.Chart = vi.fn().mockImplementation((canvas, cfg) => {
      chartConfig = cfg;
      return mockChartInstance;
    });
  });

  const dummyState = {
    chartHorizonYears: 10,
    chartReal: 'nom',
    chartMetric: 'liq',
    targetRate: 6.55,
    ipca: 4.5,
    cdiRate: 10.75,
    lots: [
      { id: 'l1', date: '2026-01-23', rate: 6.99, price: 185.02, qty: 25.35 }
    ]
  };

  const dummyComputed = {
    refDN: 9775,
    Fref: 1.0,
    custodyConfig: { custMode: 'single', cust1: 0.5 },
    posRes: {
      liqReal: 32000,
      custo: 25000,
      bruto: 35000
    }
  };

  it('renderiza curvas de projeção incluindo o Benchmark 100% CDI', () => {
    const dummyCanvas = {};
    renderProjectionChart(dummyCanvas, dummyState, dummyComputed);

    expect(globalThis.Chart).toHaveBeenCalled();
    expect(chartConfig.type).toBe('line');

    const datasetLabels = chartConfig.data.datasets.map(d => d.label);
    const cdiDataset = chartConfig.data.datasets.find(d => d.label.includes('Benchmark 100% CDI'));

    expect(cdiDataset).toBeDefined();
    expect(cdiDataset.borderColor).toBe('#c084fc');
    expect(cdiDataset.data.length).toBeGreaterThan(0);
    expect(cdiDataset.data[0]).toBeCloseTo(32000, 0); // Começa no saldo líquido de hoje
  });

  it('recalcula benchmark em valores reais quando chartReal="real"', () => {
    const dummyCanvas = {};
    const realState = { ...dummyState, chartReal: 'real' };
    renderProjectionChart(dummyCanvas, realState, dummyComputed);

    const cdiDataset = chartConfig.data.datasets.find(d => d.label.includes('Benchmark 100% CDI'));
    expect(cdiDataset).toBeDefined();
    expect(cdiDataset.data.length).toBeGreaterThan(0);
  });
});

