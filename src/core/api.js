/**
 * Camada de Integração com APIs Externas (BCB e brapi.dev)
 * Suporte a dados macroeconômicos e cotações de títulos do Tesouro Direto
 * com fallbacks e normalização de dados.
 */

import { parseNumber } from '../state/schema.js';

export const DEFAULT_TREASURY_BONDS = [
  {
    symbol: 'tesouro-renda-mais-2065',
    name: 'Tesouro Renda+ 2065 (NTN-B1)',
    bondType: 'Tesouro Renda+',
    indexer: 'ipca',
    sellRate: 6.55,
    buyRate: 6.55,
    sellPrice: 243.38,
    buyPrice: 243.38,
    baseDate: '2026-10-05'
  },
  {
    symbol: 'tesouro-ipca-2029',
    name: 'Tesouro IPCA+ 2029',
    bondType: 'Tesouro IPCA+',
    indexer: 'ipca',
    sellRate: 6.62,
    buyRate: 6.50,
    sellPrice: 3410.50,
    buyPrice: 3425.10,
    baseDate: '2026-10-06'
  },
  {
    symbol: 'tesouro-ipca-2035',
    name: 'Tesouro IPCA+ 2035',
    bondType: 'Tesouro IPCA+',
    indexer: 'ipca',
    sellRate: 6.68,
    buyRate: 6.56,
    sellPrice: 2450.20,
    buyPrice: 2468.90,
    baseDate: '2026-10-06'
  },
  {
    symbol: 'tesouro-ipca-2045',
    name: 'Tesouro IPCA+ 2045',
    bondType: 'Tesouro IPCA+',
    indexer: 'ipca',
    sellRate: 6.75,
    buyRate: 6.63,
    sellPrice: 1320.15,
    buyPrice: 1335.40,
    baseDate: '2026-10-06'
  },
  {
    symbol: 'tesouro-selic-2029',
    name: 'Tesouro Selic 2029',
    bondType: 'Tesouro Selic',
    indexer: 'selic',
    sellRate: 0.05,
    buyRate: 0.04,
    sellPrice: 15600.00,
    buyPrice: 15615.00,
    baseDate: '2026-10-06'
  },
  {
    symbol: 'tesouro-selic-01032031',
    name: 'Tesouro Selic 2031',
    bondType: 'Tesouro Selic',
    indexer: 'selic',
    sellRate: 0.10,
    buyRate: 0.09,
    sellPrice: 19943.27,
    buyPrice: 19962.22,
    baseDate: '2026-10-06'
  },
  {
    symbol: 'tesouro-prefixado-2027',
    name: 'Tesouro Prefixado 2027',
    bondType: 'Tesouro Prefixado',
    indexer: 'prefixado',
    sellRate: 12.85,
    buyRate: 12.70,
    sellPrice: 785.40,
    buyPrice: 790.10,
    baseDate: '2026-10-06'
  },
  {
    symbol: 'tesouro-prefixado-2031',
    name: 'Tesouro Prefixado 2031',
    bondType: 'Tesouro Prefixado',
    indexer: 'prefixado',
    sellRate: 13.10,
    buyRate: 12.95,
    sellPrice: 510.20,
    buyPrice: 515.80,
    baseDate: '2026-10-06'
  }
];

/**
 * Converte valores da API (números ou strings com vírgula pt-BR) para Number seguro.
 */
function normalizeApiNumber(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  return parseNumber(val, fallback);
}

/**
 * Busca dados macroeconômicos (IPCA e Selic) do SGS (BCB).
 */
export async function fetchMacroData() {
  try {
    const ipcaRes = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json');
    if (!ipcaRes.ok) throw new Error('Falha ao buscar IPCA no BCB');
    const ipcaData = await ipcaRes.json();

    let ipcaAccumulated = 1;
    for (const item of ipcaData) {
      const valor = parseFloat(item.valor) / 100;
      ipcaAccumulated *= (1 + valor);
    }
    const ipcaAnual = (ipcaAccumulated - 1) * 100;

    const selicRes = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json');
    let selicAtual = null;
    if (selicRes.ok) {
      const selicData = await selicRes.json();
      if (selicData.length > 0) {
        const rawValor = parseFloat(selicData[0].valor);
        if (rawValor > 0 && rawValor < 1) {
          // Série 11 do SGS retorna taxa diária (% a.d.). Anualização composta base 252 dias úteis.
          const selicAnual = (Math.pow(1 + rawValor / 100, 252) - 1) * 100;
          selicAtual = Number(selicAnual.toFixed(2));
        } else {
          selicAtual = Number(rawValor.toFixed(2));
        }
      }
    }

    return {
      success: true,
      ipca: Number(ipcaAnual.toFixed(2)),
      selic: selicAtual
    };
  } catch (error) {
    console.error('[API] Falha ao buscar dados macroeconômicos:', error);
    return { success: false, ipca: null, selic: null };
  }
}

/**
 * Busca cotações de títulos do Tesouro Direto via brapi.dev com fallback elegante.
 * @param {string} [token=''] Token opcional da brapi.dev
 * @returns {Promise<{success: boolean, results: Array, fromApi: boolean}>}
 */
export async function fetchTreasuryData(token = '') {
  const mergedMap = new Map();
  DEFAULT_TREASURY_BONDS.forEach(b => mergedMap.set(b.symbol, { ...b }));

  let fetchMode = 'fallback';

  // 1. Se houver token, tenta endpoint completo da brapi
  if (token && token.trim()) {
    try {
      const cleanToken = token.trim();
      const res = await fetch(`https://brapi.dev/api/v2/treasury/list?token=${cleanToken}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        list.forEach(item => {
          const sym = item.symbol || item.name || '';
          if (!sym) return;
          mergedMap.set(sym, {
            symbol: sym,
            name: item.name || item.bondType || sym,
            bondType: item.bondType || 'Tesouro Direto',
            indexer: item.indexer || 'ipca',
            sellRate: normalizeApiNumber(item.sellRate ?? item.annualProfitability ?? item.rate, 0),
            buyRate: normalizeApiNumber(item.buyRate ?? item.rate, 0),
            sellPrice: normalizeApiNumber(item.sellPrice ?? item.unitPrice ?? item.basePrice, 0),
            buyPrice: normalizeApiNumber(item.buyPrice ?? item.unitPrice, 0),
            baseDate: item.baseDate || item.date || new Date().toISOString().slice(0, 10)
          });
        });
        fetchMode = 'token';
      }
    } catch (err) {
      console.warn('[API] Erro ao buscar títulos com token na brapi:', err);
    }
  }

  // 2. Se não buscou com token (ou falhou), tenta sandbox público para atualizar títulos públicos disponíveis
  if (fetchMode === 'fallback') {
    try {
      const sandboxRes = await fetch('https://brapi.dev/api/v2/treasury/indicators?symbols=tesouro-selic-01032031');
      if (sandboxRes.ok) {
        const data = await sandboxRes.json();
        if (Array.isArray(data?.results)) {
          data.results.forEach(item => {
            const sym = item.symbol;
            if (sym && mergedMap.has(sym)) {
              const current = mergedMap.get(sym);
              mergedMap.set(sym, {
                ...current,
                sellRate: normalizeApiNumber(item.sellRate, current.sellRate),
                buyRate: normalizeApiNumber(item.buyRate, current.buyRate),
                sellPrice: normalizeApiNumber(item.sellPrice ?? item.basePrice, current.sellPrice),
                buyPrice: normalizeApiNumber(item.buyPrice, current.buyPrice),
                baseDate: item.baseDate || current.baseDate
              });
            }
          });
          fetchMode = 'sandbox';
        }
      }
    } catch (err) {
      console.warn('[API] Sandbox brapi indisponível:', err);
    }
  }

  const results = Array.from(mergedMap.values());
  return {
    success: true,
    results,
    fetchMode,
    fromApi: fetchMode !== 'fallback'
  };
}

/**
 * Localiza dados de um título específico.
 * @param {string} symbolOrName
 * @param {string} [token='']
 */
export async function findBondData(symbolOrName, token = '') {
  const { results } = await fetchTreasuryData(token);
  const target = String(symbolOrName || '').toLowerCase().trim();
  return results.find(b =>
    b.symbol.toLowerCase() === target ||
    b.name.toLowerCase().includes(target)
  ) || null;
}
