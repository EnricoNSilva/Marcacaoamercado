import { describe, it, expect, beforeEach } from 'vitest';
import { parseNumber, sanitizeLot, sanitizeState, generateLotId } from '../../src/state/schema.js';
import { loadState, saveState, clearState, STORAGE_KEY_V1, STORAGE_KEY_V2 } from '../../src/state/persistence.js';

class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

describe('Estado: Schema & Persistência com Migração', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
  });

  it('converte corretamente números formatados no padrão pt-BR com vírgula e milhar', () => {
    expect(parseNumber('243,38')).toBe(243.38);
    expect(parseNumber('1.250,50')).toBe(1250.50);
    expect(parseNumber(' 35.000,00 ')).toBe(35000);
    expect(parseNumber(123.45)).toBe(123.45);
    expect(parseNumber('', 4.5)).toBe(4.5);
    expect(parseNumber('invalido', 10)).toBe(10);
  });

  it('sanitiza e valida lotes de compras', () => {
    const lot = sanitizeLot({
      date: '2026-03-24',
      rate: '7,14',
      price: '177,03',
      qty: '56,48'
    });

    expect(lot.id).toBeDefined();
    expect(lot.rate).toBe(7.14);
    expect(lot.price).toBe(177.03);
    expect(lot.qty).toBe(56.48);
  });

  it('rejeita lote com quantidade ou preço menor ou igual a zero', () => {
    expect(() => sanitizeLot({ date: '2026-01-01', rate: 6, price: 100, qty: 0 })).toThrow();
    expect(() => sanitizeLot({ date: '2026-01-01', rate: 6, price: 0, qty: 10 })).toThrow();
  });

  it('migra de forma transparente o estado legado v1 para o schema v2', () => {
    // Simula estado salvo na v1 sem IDs nos lotes e sem ipcaCal separado
    const legacyV1 = {
      refDate: '2026-10-05',
      refPrice: 243.38,
      ipca: 4.5,
      lots: [
        { date: '2026-01-23', rate: 6.99, price: 185.02, qty: 25.35 },
        { date: '2026-03-24', rate: 7.14, price: 177.03, qty: 56.48 }
      ]
    };
    mockStorage.setItem(STORAGE_KEY_V1, JSON.stringify(legacyV1));

    const loaded = loadState(mockStorage);

    // Deve ter sido salvo na chave v2
    expect(mockStorage.getItem(STORAGE_KEY_V2)).not.toBeNull();
    // Lotes devem ter recebido IDs únicos automaticamente
    expect(loaded.lots[0].id).toBeDefined();
    expect(loaded.lots[1].id).toBeDefined();
    expect(loaded.lots[0].id).not.toBe(loaded.lots[1].id);
    // ipcaCal deve ter sido preenchido
    expect(loaded.ipcaCal).toBe(4.5);
  });
});
