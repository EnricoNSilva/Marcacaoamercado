import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '../../src/state/store.js';

class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
}

describe('Estado: Store Reativo & Correção de Bugs B1-B8', () => {
  let store;
  let mockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    store = createStore(null, { autoPersist: true, storage: mockStorage });
  });

  it('notifica inscritos com estado atualizado e recálculo financeiro', () => {
    let callCount = 0;
    let lastComputed = null;

    store.subscribe((state, computed) => {
      callCount++;
      lastComputed = computed;
    });

    store.setState({ targetRate: 7.0 });

    expect(callCount).toBe(1);
    expect(lastComputed).not.toBeNull();
    expect(store.getState().targetRate).toBe(7.0);
  });

  it('B2: alterar a projeção futura de IPCA NÃO distorce a taxa implícita de calibração hoje', () => {
    const comp1 = store.getComputed();
    const rNow1 = comp1.rNow;

    // Altera IPCA projetado de 4,5% para 9,0%
    store.setState({ ipca: 9.0 });
    const comp2 = store.getComputed();
    const rNow2 = comp2.rNow;

    // A taxa de calibração hoje deve permanecer inalterada!
    expect(rNow2).toBeCloseTo(rNow1, 8);
  });

  it('B3: exclusão de lote por ID funciona de forma determinística independente da ordem', () => {
    const stateBefore = store.getState();
    expect(stateBefore.lots).toHaveLength(4);

    const lotToRemove = stateBefore.lots[1]; // Segundo lote (lot-2)
    store.removeLot(lotToRemove.id);

    const stateAfter = store.getState();
    expect(stateAfter.lots).toHaveLength(3);
    expect(stateAfter.lots.find(l => l.id === lotToRemove.id)).toBeUndefined();
  });

  it('B4: permite edição de lote (updateLot) atualizando quantidade, preço ou taxa', () => {
    const lot = store.getState().lots[0];
    const originalQty = lot.qty;

    store.updateLot(lot.id, { qty: originalQty + 10 });

    const updatedLot = store.getState().lots.find(l => l.id === lot.id);
    expect(updatedLot.qty).toBe(originalQty + 10);

    // O recálculo financeiro reflete a nova quantidade imediatamente
    const comp = store.getComputed();
    expect(comp.posRes.q).toBeCloseTo(140.33 + 10, 2);
  });

  it('B1: convergência e spread da taxa na venda operam sem duplicação', () => {
    // Definindo choque imediato (convMonths = 0), taxa alvo = 6.0% e spread = 0.10 p.p.
    store.setState({
      convMonths: 0,
      targetRate: 6.0,
      spread: 0.10
    });

    const comp = store.getComputed();
    // Taxa na venda deve ser 6.0% + 0.10% = 6.10% (0.0610)
    expect(comp.rateAtSale).toBeCloseTo(0.0610, 4);
  });

  it('permite restaurar os padrões oficiais (resetToDefaults)', () => {
    store.setState({ targetRate: 15.0 });
    store.removeLot(store.getState().lots[0].id);

    expect(store.getState().lots).toHaveLength(3);

    store.resetToDefaults();

    expect(store.getState().lots).toHaveLength(4);
    expect(store.getState().targetRate).toBe(6.55);
    expect(store.getState().refPrice).toBe(243.38);
  });
});
