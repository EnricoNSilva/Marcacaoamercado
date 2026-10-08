/**
 * Gerenciamento de Estado - Store Reativo & Computações Memoizadas
 * Padrão de estado único com subscribe/notify e recálculo financeiro sob demanda.
 */

import { DEFAULT_STATE } from './defaults.js';
import { sanitizeState, sanitizeLot, generateLotId } from './schema.js';
import { loadState, saveState, clearState } from './persistence.js';
import {
  toDayNum,
  addYearsDN,
  calibrateModel,
  getVNAFactor,
  calcPU,
  calcRateAtSale,
  simulateSellPEPS,
  decomposeCarryAndMtM,
  calcReturnPct,
  calcRealReturn,
  calcXIRR,
  calcModifiedDuration,
  calcBreakevenRate,
  calcSensitivityTable,
  MAX_SIM_DATE,
  trunc2
} from '../core/index.js';

export function createStore(initialState = null, options = {}) {
  const { autoPersist = true, storage = null } = options;

  let state = initialState ? sanitizeState(initialState) : loadState(storage);
  const listeners = new Set();

  let computedCache = null;
  let cacheValid = false;

  function invalidateCache() {
    cacheValid = false;
    computedCache = null;
  }

  function notify() {
    invalidateCache();
    if (autoPersist) {
      saveState(state, storage);
    }
    const currentState = getState();
    const currentComputed = getComputed();
    for (const listener of listeners) {
      try {
        listener(currentState, currentComputed);
      } catch (err) {
        console.error('Erro no listener do store:', err);
      }
    }
  }

  function getState() {
    return state;
  }

  function setState(patchOrUpdater) {
    const nextRaw = typeof patchOrUpdater === 'function'
      ? patchOrUpdater(state)
      : { ...state, ...patchOrUpdater };

    state = sanitizeState(nextRaw);
    notify();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /**
   * Retorna os cálculos financeiros derivados, memoizados para alta performance.
   */
  function getComputed() {
    if (cacheValid && computedCache) {
      return computedCache;
    }

    // 1. Calibração de mercado na data de referência (hoje)
    // Correção B2: ipcaCal separado do ipca projetado
    const calibration = calibrateModel({
      refDate: state.refDate,
      refPrice: state.refPrice,
      refRate: state.refRate,
      lots: state.lots,
      ipcaCal: state.ipcaCal
    });

    const { refDN, rNow, Fref, pNow } = calibration;
    const custodyConfig = {
      custMode: state.custMode,
      cust1: state.cust1,
      cust2: state.cust2,
      cust3: state.cust3
    };

    const vnaToday = getVNAFactor(refDN, refDN, Fref, state.ipca);

    // 2. Posição Atual (hoje)
    const posRes = simulateSellPEPS({
      lots: state.lots,
      t: refDN,
      r: rNow,
      vnaFactor: vnaToday,
      overridePU: pNow,
      custodyConfig
    });

    const posLucroApp = posRes.liqApp - posRes.custo;
    const posLucroReal = posRes.liqReal - posRes.custo;
    const posReturnPct = calcReturnPct(posRes.liqApp, posRes.custo);
    const posReturnPctReal = calcReturnPct(posRes.liqReal, posRes.custo);
    const posRealReturnPct = calcRealReturn(posReturnPct, (state.ipcaCal / 100));
    const posAvgRate = posRes.q > 0
      ? (posRes.parts.reduce((acc, p) => acc + (p.lot.rate * p.q), 0) / posRes.q)
      : 0;

    // Fluxos para TIR atual
    const posCashFlows = state.lots.map(l => ({
      dn: toDayNum(l.date),
      amount: -trunc2(l.qty * l.price)
    }));
    posCashFlows.push({ dn: refDN, amount: posRes.liqApp });
    const posTIR = calcXIRR(posCashFlows);

    // 3. Simulação de Venda Futura
    const simDN = Math.min(addYearsDN(refDN, state.simYears), MAX_SIM_DATE);

    // Correção B1: taxa com convergência gradual e spread
    const rateAtSale = calcRateAtSale({
      refDN,
      simDN,
      rNow,
      targetRatePct: state.targetRate,
      convMonths: state.convMonths,
      spread: state.spread
    });

    const vnaFuture = getVNAFactor(simDN, refDN, Fref, state.ipca);
    const simPU = calcPU(simDN, rateAtSale, vnaFuture);

    const totalAvailableQty = state.lots.reduce((acc, l) => acc + l.qty, 0);
    const simQtyNum = (state.simQty !== '' && Number(state.simQty) > 0)
      ? Math.min(Number(state.simQty), totalAvailableQty)
      : totalAvailableQty;

    const simRes = simulateSellPEPS({
      lots: state.lots,
      t: simDN,
      r: rateAtSale,
      vnaFactor: vnaFuture,
      qtyToSell: simQtyNum,
      custodyConfig
    });

    const nowResForSoldQty = simulateSellPEPS({
      lots: state.lots,
      t: refDN,
      r: rNow,
      vnaFactor: vnaToday,
      qtyToSell: simQtyNum,
      overridePU: pNow,
      custodyConfig
    });

    const simLucroLiq = simRes.liqReal - simRes.custo;
    const simDiffHoje = simRes.liqReal - nowResForSoldQty.liqReal;
    const simReturnPct = calcReturnPct(simRes.liqReal, simRes.custo);

    // Correção B8: deflator em dias úteis / 252 para paridade exata com o VNA
    const deflatorFactor = getVNAFactor(simDN, refDN, 1.0, state.ipca);
    const simLiqDeflacionado = simRes.liqReal / deflatorFactor;

    // TIR projetada até a data da venda
    const simCashFlows = simRes.parts.map(p => ({
      dn: p.lot.dn,
      amount: -trunc2(p.q * p.lot.price)
    }));
    simCashFlows.push({ dn: simDN, amount: simRes.liqReal });
    const simTIR = calcXIRR(simCashFlows);

    // Decomposição Carrego vs Marcação
    const decomposition = decomposeCarryAndMtM({
      simRes,
      simDN,
      vnaFactor: vnaFuture
    });

    // Duration Modificada
    const duration = calcModifiedDuration(refDN, rNow);

    // Taxa de empate (breakeven) no horizonte da venda
    const breakevenRate = calcBreakevenRate({
      lots: state.lots,
      simDN,
      vnaFactor: vnaFuture,
      custodyConfig
    });

    computedCache = {
      calibration,
      refDN,
      rNow,
      pNow,
      Fref,
      vnaToday,
      posRes,
      posLucroApp,
      posLucroReal,
      posReturnPct,
      posReturnPctReal,
      posRealReturnPct,
      posAvgRate,
      posTIR,
      simDN,
      rateAtSale,
      vnaFuture,
      simPU,
      simQtyNum,
      simRes,
      nowResForSoldQty,
      simLucroLiq,
      simDiffHoje,
      simReturnPct,
      simLiqDeflacionado,
      simTIR,
      decomposition,
      duration,
      breakevenRate,
      custodyConfig
    };

    cacheValid = true;
    return computedCache;
  }

  // Métodos de manipulação de lotes (Corrigindo B3 e B4)
  function addLot(rawLot) {
    const lot = sanitizeLot({
      ...rawLot,
      id: generateLotId()
    });
    setState(s => ({
      ...s,
      lots: [...s.lots, lot]
    }));
  }

  function updateLot(id, patch) {
    setState(s => ({
      ...s,
      lots: s.lots.map(l => {
        if (l.id !== id) return l;
        return sanitizeLot({ ...l, ...patch });
      })
    }));
  }

  function removeLot(id) {
    if (state.lots.length <= 1) {
      throw new Error('A carteira deve conter pelo menos um lote investido.');
    }
    setState(s => ({
      ...s,
      lots: s.lots.filter(l => l.id !== id)
    }));
  }

  function resetToDefaults() {
    clearState(storage);
    state = sanitizeState(DEFAULT_STATE);
    notify();
  }

  return {
    getState,
    setState,
    subscribe,
    getComputed,
    addLot,
    updateLot,
    removeLot,
    resetToDefaults
  };
}
