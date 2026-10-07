import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderAllocationChart } from '../../src/ui/charts/allocationChart.js';

describe('UI: Gráfico Donut de Alocação e Diversificação', () => {
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
    selectedBond: 'tesouro-renda-mais-2065'
  };

  const dummyComputed = {
    posRes: {
      liqApp: 32000,
      parts: [
        { lot: { id: 'l1', date: '2026-01-23', indexer: 'ipca' }, liqApp: 10000 },
        { lot: { id: 'l2', date: '2026-03-24', indexer: 'selic' }, liqApp: 12000 },
        { lot: { id: 'l3', date: '2026-06-08', indexer: 'prefixado' }, liqApp: 10000 }
      ]
    }
  };

  it('renderiza gráfico em formato doughnut com modo indexador correto', () => {
    const dummyCanvas = {};
    renderAllocationChart(dummyCanvas, dummyState, dummyComputed, 'indexer');

    expect(globalThis.Chart).toHaveBeenCalled();
    expect(chartConfig.type).toBe('doughnut');
    expect(chartConfig.data.labels).toEqual(['IPCA+ / Renda+', 'Tesouro Selic', 'Tesouro Prefixado']);
    expect(chartConfig.data.datasets[0].data).toEqual([10000, 12000, 10000]);
  });

  it('renderiza agrupamento por lotes individuais quando solicitado', () => {
    const dummyCanvas = {};
    renderAllocationChart(dummyCanvas, dummyState, dummyComputed, 'lots');

    expect(globalThis.Chart).toHaveBeenCalled();
    expect(chartConfig.data.labels.length).toBe(3);
    expect(chartConfig.data.datasets[0].data).toEqual([10000, 12000, 10000]);
  });

  it('destrói instância prévia antes de recriar gráfico', () => {
    const dummyCanvas = {};
    renderAllocationChart(dummyCanvas, dummyState, dummyComputed, 'indexer');
    expect(mockChartInstance.destroy).not.toHaveBeenCalled();

    renderAllocationChart(dummyCanvas, dummyState, dummyComputed, 'indexer');
    expect(mockChartInstance.destroy).toHaveBeenCalledTimes(1);
  });
});

