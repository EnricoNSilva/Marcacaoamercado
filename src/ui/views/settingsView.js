/**
 * View: Premissas, Custos & Metodologia (Aba 5)
 * Calibração de mercado, seleção de títulos, integração brapi e parâmetros tributários da B3.
 */

import { DEFAULT_TREASURY_BONDS, fetchTreasuryData } from '../../core/api.js';
import { fmtBRL, fmtPct } from '../format.js';

export function createSettingsView(store) {
  const fields = [
    { id: "cfgRefDate", key: "refDate" },
    { id: "cfgRefPrice", key: "refPrice" },
    { id: "cfgRefRate", key: "refRate" },
    { id: "cfgSpread", key: "spread" },
    { id: "cfgIpcaCal", key: "ipcaCal" },
    { id: "cfgCustMode", key: "custMode" },
    { id: "cfgCust1", key: "cust1" },
    { id: "cfgCust2", key: "cust2" },
    { id: "cfgCust3", key: "cust3" },
    { id: "cfgBrapiToken", key: "brapiToken" }
  ];

  const bondSelect = document.getElementById("cfgBondSelect");
  const btnSyncTreasury = document.getElementById("btnSyncTreasury");
  const syncTreasuryStatus = document.getElementById("syncTreasuryStatus");

  let treasuryBondsCache = [...DEFAULT_TREASURY_BONDS];

  // Popula o <select> com os títulos disponíveis
  function populateBondSelect(selectedSymbol) {
    if (!bondSelect) return;
    const currentVal = selectedSymbol || bondSelect.value || 'tesouro-renda-mais-2065';
    bondSelect.innerHTML = '';

    treasuryBondsCache.forEach(bond => {
      const opt = document.createElement('option');
      opt.value = bond.symbol;
      const rateLabel = bond.indexer === 'selic' ? `Selic + ${fmtPct(bond.sellRate / 100)}` :
                        bond.indexer === 'prefixado' ? `${fmtPct(bond.sellRate / 100)} a.a.` :
                        `IPCA + ${fmtPct(bond.sellRate / 100)}`;
      opt.textContent = `${bond.name} (${rateLabel} · PU ${fmtBRL(bond.sellPrice)})`;
      if (bond.symbol === currentVal) {
        opt.selected = true;
      }
      bondSelect.appendChild(opt);
    });
  }

  populateBondSelect(store.getState().selectedBond);

  // Evento ao mudar de título no select
  if (bondSelect) {
    bondSelect.addEventListener('change', (e) => {
      const symbol = e.target.value;
      const bond = treasuryBondsCache.find(b => b.symbol === symbol);
      if (bond) {
        store.setState({
          selectedBond: symbol,
          refPrice: bond.sellPrice,
          refRate: bond.sellRate,
          refDate: bond.baseDate || store.getState().refDate
        });
        if (syncTreasuryStatus) {
          syncTreasuryStatus.innerHTML = `✅ Cotação aplicada: <strong>${bond.name}</strong> (PU ${fmtBRL(bond.sellPrice)} · Taxa ${bond.sellRate}%)`;
          syncTreasuryStatus.style.color = 'var(--pos-color)';
        }
      }
    });
  }

  // Evento ao clicar em Sincronizar Cotação
  if (btnSyncTreasury) {
    btnSyncTreasury.addEventListener('click', async () => {
      if (syncTreasuryStatus) {
        syncTreasuryStatus.innerHTML = '🔄 Consultando cotação de mercado na brapi.dev...';
        syncTreasuryStatus.style.color = 'var(--text-muted)';
      }

      const state = store.getState();
      const res = await fetchTreasuryData(state.brapiToken);

      if (res.success && res.results.length > 0) {
        treasuryBondsCache = res.results;
        populateBondSelect(state.selectedBond);

        const currentBond = treasuryBondsCache.find(b => b.symbol === state.selectedBond);
        if (currentBond) {
          store.setState({
            refPrice: currentBond.sellPrice,
            refRate: currentBond.sellRate,
            refDate: currentBond.baseDate || state.refDate
          });
        }

        if (syncTreasuryStatus) {
          let sourceText = 'Referência de Fechamento';
          let color = 'var(--pos-color)';
          let icon = '✅';
          
          if (res.fetchMode === 'custom') {
            const apiDate = res.results[0]?.baseDate;
            const apiDateFmt = apiDate ? apiDate.split('-').reverse().join('/') : 'Ontem';
            sourceText = `API Tesouro Transparente (Ref. ${apiDateFmt})`;
          } else if (res.fetchMode === 'token') {
            sourceText = 'brapi.dev ao vivo (Token Válido)';
          } else if (res.fetchMode === 'sandbox') {
            sourceText = 'brapi.dev Sandbox (Limitado)';
            color = 'var(--warning-color, #eab308)';
            icon = '⚠️';
          }
          
          syncTreasuryStatus.innerHTML = `${icon} Atualizado com sucesso (${sourceText} às ${new Date().toLocaleTimeString()})`;
          syncTreasuryStatus.style.color = color;
        }
      } else {
        if (syncTreasuryStatus) {
          syncTreasuryStatus.innerHTML = '⚠️ Não foi possível obter cotação ao vivo. Mantidos valores de referência.';
          syncTreasuryStatus.style.color = 'var(--warning-color, #eab308)';
        }
      }
    });
  }

  // Listeners dos campos de formulário manuais
  fields.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", (e) => {
      store.setState({ [key]: e.target.value });
    });
  });

  function render(state, computed) {
    fields.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = state[key] ?? "";
      if (el.value !== String(val)) {
        el.value = val;
      }
    });

    if (bondSelect && state.selectedBond && bondSelect.value !== state.selectedBond) {
      bondSelect.value = state.selectedBond;
    }
  }

  return { render };
}
