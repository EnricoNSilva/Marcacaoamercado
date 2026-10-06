/**
 * Interface - Formatadores de Moeda, Percentual e Números pt-BR
 */

import { formatBRLDate } from '../core/dates.js';

export { formatBRLDate };

/**
 * Formata valor em Real brasileiro (R$).
 * @param {number} v
 * @returns {string}
 */
export function fmtBRL(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

/**
 * Formata taxa ou percentual decimal em string com símbolo %.
 * Ex: 0.0655 -> "6,55%"
 * @param {number} v
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function fmtPct(v, decimals = 2) {
  const num = (Number(v) || 0) * 100;
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }) + '%';
}

/**
 * Formata taxa já em escala percentual (ex: 6.55 -> "6,55%").
 * @param {number} v
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function fmtPctDirect(v, decimals = 2) {
  const num = Number(v) || 0;
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }) + '%';
}

/**
 * Formata quantidade ou número com casas decimais pt-BR.
 * @param {number} v
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function fmtNum(v, decimals = 2) {
  return (Number(v) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
