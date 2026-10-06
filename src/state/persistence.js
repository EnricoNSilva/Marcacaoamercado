/**
 * Gerenciamento de Estado - Persistência & Migração de Dados
 * localStorage versionado (v2) com migração automática transparente da v1.
 */

import { DEFAULT_STATE } from './defaults.js';
import { sanitizeState, generateLotId } from './schema.js';

export const STORAGE_KEY_V2 = 'renda2065_ihc_v2';
export const STORAGE_KEY_V1 = 'renda2065_ihc_v1';

/**
 * Carrega o estado do localStorage com migração automática caso venha da v1.
 * @param {Storage} [storage=window.localStorage]
 * @returns {Object} Estado sanitizado
 */
export function loadState(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return sanitizeState(DEFAULT_STATE);

  try {
    // 1. Tenta carregar v2
    const savedV2 = storage.getItem(STORAGE_KEY_V2);
    if (savedV2) {
      const parsed = JSON.parse(savedV2);
      return sanitizeState(parsed);
    }

    // 2. Migração da v1 legada
    const savedV1 = storage.getItem(STORAGE_KEY_V1);
    if (savedV1) {
      const parsedV1 = JSON.parse(savedV1);
      // Migra lotes garantindo IDs únicos
      if (Array.isArray(parsedV1.lots)) {
        parsedV1.lots = parsedV1.lots.map(l => ({
          ...l,
          id: l.id || generateLotId()
        }));
      }
      // Garante ipcaCal separado
      parsedV1.ipcaCal = parsedV1.ipcaCal ?? parsedV1.ipca ?? 4.5;

      const migrated = sanitizeState(parsedV1);
      // Persiste no novo formato v2
      storage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
      return migrated;
    }
  } catch (err) {
    console.warn('Erro ao carregar ou migrar estado do localStorage:', err);
  }

  return sanitizeState(DEFAULT_STATE);
}

/**
 * Salva o estado atual no localStorage.
 * @param {Object} state
 * @param {Storage} [storage=window.localStorage]
 */
export function saveState(state, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
  } catch (err) {
    console.error('Erro ao salvar estado no localStorage:', err);
  }
}

/**
 * Restaura o estado para o padrão de fábrica.
 * @param {Storage} [storage=window.localStorage]
 * @returns {Object}
 */
export function clearState(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY_V2);
      storage.removeItem(STORAGE_KEY_V1);
    } catch (e) {}
  }
  return sanitizeState(DEFAULT_STATE);
}

/**
 * Exporta o estado em formato JSON formatado para backup.
 * @param {Object} state
 * @returns {string}
 */
export function exportStateJson(state) {
  return JSON.stringify(state, null, 2);
}

/**
 * Importa e sanitiza estado a partir de uma string JSON.
 * @param {string} jsonStr
 * @returns {Object} Estado importado e validado
 */
export function importStateJson(jsonStr) {
  const parsed = JSON.parse(jsonStr);
  return sanitizeState(parsed);
}
