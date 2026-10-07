import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMacroData, fetchTreasuryData, findBondData, DEFAULT_TREASURY_BONDS } from '../../src/core/api.js';

describe('API: Integração BCB e brapi.dev com Fallbacks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('possui catálogo padrão de títulos do Tesouro Direto bem configurado', () => {
    expect(DEFAULT_TREASURY_BONDS.length).toBeGreaterThanOrEqual(5);
    const rendaMais = DEFAULT_TREASURY_BONDS.find(b => b.symbol === 'tesouro-renda-mais-2065');
    expect(rendaMais).toBeDefined();
    expect(rendaMais.sellPrice).toBe(243.38);
    expect(rendaMais.sellRate).toBe(6.55);
  });

  it('fetchTreasuryData retorna títulos com formato normalizado mesmo sem conexão ao vivo', async () => {
    // Simula falha de rede para testar robustez do fallback
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const data = await fetchTreasuryData();
    expect(data.success).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.fromApi).toBe(false);

    const first = data.results[0];
    expect(typeof first.sellRate).toBe('number');
    expect(typeof first.sellPrice).toBe('number');
  });

  it('findBondData localiza título por símbolo ou correspondência de nome', async () => {
    const bondBySymbol = await findBondData('tesouro-renda-mais-2065');
    expect(bondBySymbol).not.toBeNull();
    expect(bondBySymbol.symbol).toBe('tesouro-renda-mais-2065');

    const bondByName = await findBondData('IPCA+ 2029');
    expect(bondByName).not.toBeNull();
    expect(bondByName.symbol).toBe('tesouro-ipca-2029');
  });

  it('fetchMacroData calcula IPCA acumulado e obtém Selic anualizada da Série 11 se a API responder com sucesso', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url.includes('433')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { data: '01/01/2026', valor: '0.40' },
            { data: '01/02/2026', valor: '0.35' }
          ])
        });
      }
      if (url.includes('sgs.11') || url.includes('/11/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { data: '06/10/2026', valor: '0.050788' }
          ])
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const res = await fetchMacroData();
    expect(res.success).toBe(true);
    expect(res.ipca).toBeGreaterThan(0);
    // (1 + 0.050788/100)^252 - 1 = ~13.65% a.a.
    expect(res.selic).toBe(13.65);
  });
});

