/**
 * View: Matriz de Estresse & Sensibilidade (Aba 4)
 * Heatmap de cenários e análise de duration modificada.
 */

import { addYearsDN, getVNAFactor, calcPU, simulateSellPEPS, MAX_SIM_DATE, trunc2 } from '../../core/index.js';
import { fmtBRL, fmtPct, fmtNum } from '../format.js';

export function createMatrixView(store) {
  const matrixTable = document.getElementById('matrixTable');
  const sensTable = document.getElementById('sensTable');
  const durationExplanation = document.getElementById('durationExplanation');

  function render(state, computed) {
    const { refDN, rNow, pNow, Fref, posRes, duration, custodyConfig } = computed;
    const horizons = [0, 1, 2, 3, 5, 10, 15, 20, 30];
    const rates = [0.045, 0.05, 0.055, 0.06, 0.065, 0.07, 0.075, 0.08, 0.085];

    // 1. Matriz de Cenários
    if (matrixTable) {
      let html = '<thead><tr><th>Taxa na Venda ↓ / Prazo →</th>';
      horizons.forEach(h => {
        html += `<th style="text-align:center">${h === 0 ? 'Hoje' : h + ' ano(s)'}</th>`;
      });
      html += '</tr></thead><tbody>';

      // Linha de Carrego Puro (Correção B5: Carrego Líquido para comparação justa e precisa)
      html += '<tr><td><strong>Carrego Puro (Líquido)</strong></td>';
      horizons.forEach(h => {
        const d = Math.min(addYearsDN(refDN, h), MAX_SIM_DATE);
        const vna = getVNAFactor(d, refDN, Fref, state.ipca);

        // Simula venda onde cada lote é liquidado ao seu próprio PU de carrego contratado
        const carryRes = simulateSellPEPS({
          lots: state.lots,
          t: d,
          r: rNow, // taxa base
          vnaFactor: vna,
          custodyConfig
        });

        // Calcula saldo líquido projetado do carrego
        const lucroLiqCarrego = carryRes.liqReal - carryRes.custo;
        const pctCarrego = carryRes.custo > 0 ? (lucroLiqCarrego / carryRes.custo) : 0;
        const bg = lucroLiqCarrego >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';

        html += `<td>
          <div class="matrix-cell" style="background:${bg}">
            <span class="v-liq">${fmtBRL(carryRes.liqReal)}</span>
            <span class="v-pct pos">+${fmtPct(pctCarrego, 1)}</span>
          </div>
        </td>`;
      });
      html += '</tr>';

      // Linhas por Taxa Alvo de Mercado
      rates.forEach(r => {
        const isCurrent = Math.abs(r - rNow) < 0.0025;
        html += `<tr><td><strong>IPCA + ${fmtPct(r)}</strong> ${isCurrent ? '<span class="badge badge-neutral">Atual</span>' : ''}</td>`;

        horizons.forEach(h => {
          const d = Math.min(addYearsDN(refDN, h), MAX_SIM_DATE);
          const vna = getVNAFactor(d, refDN, Fref, state.ipca);
          const res = simulateSellPEPS({
            lots: state.lots,
            t: d,
            r,
            vnaFactor: vna,
            custodyConfig
          });

          const lucro = res.liqReal - res.custo;
          const pctGain = res.custo > 0 ? (lucro / res.custo) : 0;
          const alpha = Math.min(Math.abs(pctGain) / 0.8, 1) * 0.35 + 0.08;
          const bg = pctGain >= 0 ? `rgba(16, 185, 129, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
          const sign = pctGain >= 0 ? '+' : '';
          const cls = pctGain >= 0 ? 'pos' : 'neg';

          html += `<td>
            <div class="matrix-cell" style="background:${bg}">
              <span class="v-liq">${fmtBRL(res.liqReal)}</span>
              <span class="v-pct ${cls}">${sign}${fmtPct(pctGain, 1)}</span>
            </div>
          </td>`;
        });
        html += '</tr>';
      });

      matrixTable.innerHTML = html + '</tbody>';
    }

    // 2. Tabela de Sensibilidade Imediata
    if (sensTable) {
      const shocks = [-1.0, -0.5, -0.25, -0.1, 0.1, 0.25, 0.5, 1.0];
      const vnaToday = getVNAFactor(refDN, refDN, Fref, state.ipca);

      let sHtml = '<thead><tr><th>Choque na Taxa</th>' +
        shocks.map(s => `<th style="text-align:center">${s > 0 ? '+' : ''}${s.toFixed(2)} p.p.</th>`).join('') +
        '</tr></thead><tbody>';

      sHtml += '<tr><td>Taxa Resultante</td>' +
        shocks.map(s => `<td style="text-align:center">IPCA + ${fmtPct(rNow + s / 100)}</td>`).join('') +
        '</tr>';

      sHtml += '<tr><td>Novo PU</td>' +
        shocks.map(s => `<td style="text-align:center">${fmtBRL(calcPU(refDN, rNow + s / 100, vnaToday))}</td>`).join('') +
        '</tr>';

      sHtml += '<tr><td>Variação Saldo Bruto</td>' + shocks.map(s => {
        const shockRes = simulateSellPEPS({
          lots: state.lots,
          t: refDN,
          r: rNow + s / 100,
          vnaFactor: vnaToday,
          custodyConfig
        });
        const dif = shockRes.bruto - posRes.bruto;
        const sign = dif >= 0 ? '+' : '';
        const cls = dif >= 0 ? 'pos' : 'neg';
        return `<td style="text-align:center" class="${cls}">${sign}${fmtBRL(dif)}</td>`;
      }).join('') + '</tr></tbody>';

      sensTable.innerHTML = sHtml;
    }

    // 3. Explicação de Duration
    if (durationExplanation) {
      durationExplanation.innerHTML = `
        <strong>Duration Modificada Estimada: ≈ ${fmtNum(duration, 1)} anos.</strong> Cada variação de 0,10 p.p. na taxa do título movimenta aproximadamente <strong>${fmtNum(duration * 0.1, 1)}%</strong> do seu valor de mercado.
      `;
    }
  }

  return { render };
}
