import { describe, it, expect } from 'vitest';
import { getIRRate, getIRSchedule, calcIOF, calcCustodyFee, IOF_TABLE } from '../../src/core/taxes.js';

describe('Motor Financeiro: Tributação e Custódia B3', () => {
  it('aplica as alíquotas corretas da tabela regressiva de IR', () => {
    expect(getIRRate(1)).toBe(0.225);
    expect(getIRRate(180)).toBe(0.225);
    expect(getIRRate(181)).toBe(0.20);
    expect(getIRRate(360)).toBe(0.20);
    expect(getIRRate(361)).toBe(0.175);
    expect(getIRRate(720)).toBe(0.175);
    expect(getIRRate(721)).toBe(0.15);
    expect(getIRRate(3650)).toBe(0.15);
  });

  it('retorna cronograma de IR regressivo e contagem regressiva para próxima faixa', () => {
    const sched100 = getIRSchedule(100);
    expect(sched100.rate).toBe(0.225);
    expect(sched100.nextRate).toBe(0.20);
    expect(sched100.daysRemaining).toBe(81);
    expect(sched100.statusText).toBe('81d p/ 20%');

    const sched250 = getIRSchedule(250);
    expect(sched250.rate).toBe(0.20);
    expect(sched250.nextRate).toBe(0.175);
    expect(sched250.daysRemaining).toBe(111);

    const sched500 = getIRSchedule(500);
    expect(sched500.rate).toBe(0.175);
    expect(sched500.nextRate).toBe(0.15);
    expect(sched500.daysRemaining).toBe(221);

    const sched800 = getIRSchedule(800);
    expect(sched800.rate).toBe(0.15);
    expect(sched800.nextRate).toBeNull();
    expect(sched800.daysRemaining).toBe(0);
  });

  it('aplica a tabela regressiva de IOF para prazos menores que 30 dias', () => {
    expect(calcIOF(1000, 1)).toBe(960); // 96%
    expect(calcIOF(1000, 15)).toBe(500); // 50%
    expect(calcIOF(1000, 29)).toBe(30);  // 3%
    expect(calcIOF(1000, 30)).toBe(0);   // Isento no 30º dia
    expect(calcIOF(1000, 45)).toBe(0);
    expect(calcIOF(-500, 5)).toBe(0);    // Sem ganho não há IOF
  });

  it('calcula a taxa de custódia B3 com modelo de alíquota única (single)', () => {
    // R$ 34.153,50 resgatado com 255 dias decorridos a 0,50% a.a.
    // 34.153,50 * 0.005 * (255 / 365) = 119,30
    const fee = calcCustodyFee(34153.50, 255, { custMode: 'single', cust1: 0.50 });
    expect(fee).toBe(119.30);

    // Acima de 10 anos (3652.5 dias): alíquota cai para 0,20%
    const fee12Years = calcCustodyFee(50000, 4380, { custMode: 'single', cust1: 0.50, cust2: 0.20 });
    // 50000 * 0.002 * (4380 / 365) = 50000 * 0.002 * 12 = 1200
    expect(fee12Years).toBe(1200);

    // Isento se custMode for 'none'
    expect(calcCustodyFee(50000, 300, { custMode: 'none' })).toBe(0);
  });

  it('calcula a taxa de custódia B3 com modelo escalonado marginal', () => {
    // 12 anos (4380 dias) = 3652.5 dias a 0,50% + 727.5 dias a 0,20%
    // 50000 * (3652.5 * 0.005 + 727.5 * 0.002) / 365 = 2701.02
    const feeMarginal = calcCustodyFee(50000, 4380, {
      custMode: 'marginal',
      cust1: 0.50,
      cust2: 0.20,
      cust3: 0.10
    });
    expect(feeMarginal).toBe(2701.02);
  });
});
