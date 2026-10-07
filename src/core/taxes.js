/**
 * Motor Financeiro - Módulo de Tributação & Custódia B3
 * Regras da Tabela Regressiva de Renda Fixa, IOF e Custódia Regressiva B3.
 */

import { trunc2 } from './bond.js';

// Tabela de alíquotas de IOF regressivo para os primeiros 30 dias (em %)
export const IOF_TABLE = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
  63, 60, 56, 53, 50, 46, 43, 40, 36, 33,
  30, 26, 23, 20, 16, 13, 10,  6,  3,  0
];

/**
 * Retorna a alíquota de Imposto de Renda (IR) regressivo conforme o prazo em dias corridos.
 * @param {number} days
 * @returns {number} Alíquota em decimal (0.225, 0.20, 0.175 ou 0.15)
 */
export function getIRRate(days) {
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.20;
  if (days <= 720) return 0.175;
  return 0.15;
}

/**
 * Retorna informações sobre a alíquota atual de IR e os dias restantes para a próxima faixa regressiva.
 * @param {number} days - Dias corridos decorridos desde a compra
 * @returns {{ rate: number, nextRate: number|null, daysRemaining: number, label: string, statusText: string }}
 */
export function getIRSchedule(days) {
  const d = Math.max(0, Math.floor(days));
  if (d <= 180) {
    const daysLeft = 181 - d;
    return {
      rate: 0.225,
      nextRate: 0.20,
      daysRemaining: daysLeft,
      label: '22,5%',
      statusText: `${daysLeft}d p/ 20%`
    };
  }
  if (d <= 360) {
    const daysLeft = 361 - d;
    return {
      rate: 0.20,
      nextRate: 0.175,
      daysRemaining: daysLeft,
      label: '20,0%',
      statusText: `${daysLeft}d p/ 17,5%`
    };
  }
  if (d <= 720) {
    const daysLeft = 721 - d;
    return {
      rate: 0.175,
      nextRate: 0.15,
      daysRemaining: daysLeft,
      label: '17,5%',
      statusText: `${daysLeft}d p/ 15%`
    };
  }
  return {
    rate: 0.15,
    nextRate: null,
    daysRemaining: 0,
    label: '15,0%',
    statusText: 'Mínima (15%)'
  };
}

/**
 * Calcula o IOF retido sobre o rendimento positivo para resgates com menos de 30 dias.
 * @param {number} ganho - Lucro bruto (em R$)
 * @param {number} days - Dias corridos decorridos
 * @returns {number}
 */
export function calcIOF(ganho, days) {
  if (ganho <= 0 || days >= 30) return 0;
  const dayIndex = Math.max(1, Math.min(30, Math.floor(days))) - 1;
  const rate = IOF_TABLE[dayIndex] / 100;
  return trunc2(ganho * rate);
}

/**
 * Calcula a taxa de custódia da B3 no resgate antecipado do RENDA+.
 * @param {number} valor - Valor bruto a ser resgatado
 * @param {number} days - Dias corridos decorridos
 * @param {Object} [config]
 * @param {string} [config.custMode='single'] - 'single' | 'marginal' | 'none'
 * @param {number} [config.cust1=0.50] - % a.a. até 10 anos
 * @param {number} [config.cust2=0.20] - % a.a. de 10 a 20 anos
 * @param {number} [config.cust3=0.10] - % a.a. acima de 20 anos
 * @returns {number}
 */
export function calcCustodyFee(valor, days, config = {}) {
  const {
    custMode = 'single',
    cust1 = 0.50,
    cust2 = 0.20,
    cust3 = 0.10
  } = config;

  if (custMode === 'none' || days <= 0 || valor <= 0) return 0;

  const d10 = 3652.5;
  const d20 = 7305.0;
  const c1 = (Number(cust1) || 0) / 100;
  const c2 = (Number(cust2) || 0) / 100;
  const c3 = (Number(cust3) || 0) / 100;

  if (custMode === 'single') {
    const rate = days <= d10 ? c1 : days <= d20 ? c2 : c3;
    return trunc2(valor * rate * (days / 365.0));
  } else {
    // Escalonamento marginal
    const fee1 = Math.min(days, d10) * c1;
    const fee2 = Math.min(Math.max(days - d10, 0), d10) * c2;
    const fee3 = Math.max(days - d20, 0) * c3;
    return trunc2(valor * (fee1 + fee2 + fee3) / 365.0);
  }
}
