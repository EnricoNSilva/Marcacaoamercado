import { describe, it, expect } from 'vitest';
import { renderInfoTip } from '../../src/ui/components/infoTip.js';
import { renderKpiCard } from '../../src/ui/components/kpiCard.js';
import { GLOSSARY } from '../../src/content/glossary.js';

describe('UI & IHC: Balões Explicativos e Cards de KPI (Fase 4)', () => {
  it('renderiza o balão informativo com o texto correto do glossário', () => {
    const tipHtml = renderInfoTip('puResgate');
    expect(tipHtml).toContain('infotip-container');
    expect(tipHtml).toContain('infotip-trigger');
    expect(tipHtml).toContain(GLOSSARY.puResgate);
  });

  it('renderiza KPI card contendo o balão informativo embutido', () => {
    const cardHtml = renderKpiCard({
      label: 'Saldo Líquido (App)',
      value: 'R$ 32.147,92',
      sub: 'Lucro +R$ 7.489,01',
      valClass: 'pos',
      tooltipKey: 'saldoLiqApp'
    });

    expect(cardHtml).toContain('Saldo Líquido (App)');
    expect(cardHtml).toContain('R$ 32.147,92');
    expect(cardHtml).toContain('infotip-popup');
    expect(cardHtml).toContain(GLOSSARY.saldoLiqApp);
  });

  it('o glossário possui termos para todas as principais métricas exigidas', () => {
    expect(GLOSSARY.rentabilidadeLiq).toBeDefined();
    expect(GLOSSARY.tir).toBeDefined();
    expect(GLOSSARY.puResgate).toBeDefined();
    expect(GLOSSARY.saldoBruto).toBeDefined();
    expect(GLOSSARY.saldoLiqReal).toBeDefined();
    expect(GLOSSARY.carregoPuro).toBeDefined();
    expect(GLOSSARY.marcacaoMercado).toBeDefined();
    expect(GLOSSARY.duration).toBeDefined();
  });
});
