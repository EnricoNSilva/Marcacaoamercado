/**
 * View: Matriz de Estresse & Sensibilidade (Aba 4)
 * Heatmap de cenários, sensibilidade imediata com métricas de % e tooltips.
 */

import { addYearsDN, getVNAFactor, calcPU, simulateSellPEPS, MAX_SIM_DATE } from '../../core/index.js';
import { fmtBRL, fmtPct, fmtNum } from '../format.js';
import { renderInfoTip } from '../components/infoTip.js';

export function createMatrixView(store) {
  const matrixTable = document.getElementById('matrixTable');
  const sensTable = document.getElementById('sensTable');
  const durationExplanation = document.getElementById('durationExplanation');

  function render(state, computed) {
    const { refDN, rNow, pNow, Fref, posRes, duration, custodyConfig } = computed;
    const horizons = [0, 1, 2, 3, 5, 10, 15, 20, 30];
    const rates = [0.045, 0.05, 0.055, 0.06, 0.065, 0.07, 0.075, 0.08, 0.085];
    const vnaToday = getVNAFactor(refDN, refDN, Fref, state.ipca);
    const baseReturnPct = posRes.custo > 0 ? ((posRes.liqApp - posRes.custo) / posRes.custo) : 0;

    // 1. Matriz de Cenários
    if (matrixTable) {
      let html = '<thead><tr><th>Taxa na Venda ↓ / Prazo →</th>';
      horizons.forEach(h => {
        html += `<th style="text-align:center">${h === 0 ? 'Hoje' : h + ' ano(s)'}</th>`;
      });
      html += '</tr></thead><tbody>';

      // Linha de Carrego Puro Líquido (B5)
      html += `<tr><td><strong>Carrego Puro (Líquido)</strong> ${renderInfoTip('carregoPuro')}</td>`;
      horizons.forEach(h => {
        const d = Math.min(addYearsDN(refDN, h), MAX_SIM_DATE);
        const vna = getVNAFactor(d, refDN, Fref, state.ipca);

        const carryRes = simulateSellPEPS({
          lots: state.lots,
          t: d,
          r: rNow,
          vnaFactor: vna,
          custodyConfig
        });

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

    // 2. Tabela de Sensibilidade Imediata com Métricas de Rentabilidade (%)
    if (sensTable) {
      const shocks = [-1.0, -0.5, -0.25, -0.1, 0.1, 0.25, 0.5, 1.0];

      // Pré-calcula os resultados de cada choque
      const shockResults = shocks.map(s => {
        const newRate = rNow + s / 100;
        const newPU = calcPU(refDN, newRate, vnaToday);
        const puVarPct = (newPU - pNow) / pNow;

        const shockRes = simulateSellPEPS({
          lots: state.lots,
          t: refDN,
          r: newRate,
          vnaFactor: vnaToday,
          custodyConfig,
          overridePU: newPU
        });

        const brutoDiff = shockRes.bruto - posRes.bruto;
        const shockReturnPct = shockRes.custo > 0 ? ((shockRes.liqApp - shockRes.custo) / shockRes.custo) : 0;
        const returnDiffPP = (shockReturnPct - baseReturnPct) * 100;

        return {
          shock: s,
          newRate,
          newPU,
          puVarPct,
          brutoDiff,
          shockReturnPct,
          returnDiffPP
        };
      });

      let sHtml = '<thead><tr><th>Choque na Taxa ' + renderInfoTip('choqueTaxa') + '</th>' +
        shockResults.map(r => `<th style="text-align:center">${r.shock > 0 ? '+' : ''}${r.shock.toFixed(2)} p.p.</th>`).join('') +
        '</tr></thead><tbody>';

      // Linha 1: Taxa Resultante
      sHtml += '<tr><td><strong>Taxa Resultante</strong></td>' +
        shockResults.map(r => `<td style="text-align:center">IPCA + ${fmtPct(r.newRate)}</td>`).join('') +
        '</tr>';

      // Linha 2: Novo PU
      sHtml += '<tr><td><strong>Novo PU de Resgate</strong></td>' +
        shockResults.map(r => `<td style="text-align:center">${fmtBRL(r.newPU)}</td>`).join('') +
        '</tr>';

      // Linha 3: Variação % do Preço (PU)
      sHtml += '<tr><td><strong>Variação % no Preço (PU)</strong> ' + renderInfoTip('duration') + '</td>' +
        shockResults.map(r => {
          const sign = r.puVarPct >= 0 ? '+' : '';
          const cls = r.puVarPct >= 0 ? 'pos' : 'neg';
          return `<td style="text-align:center;font-weight:600" class="${cls}">${sign}${fmtPct(r.puVarPct)}</td>`;
        }).join('') + '</tr>';

      // Linha 4: Variação em Saldo Bruto (R$)
      sHtml += '<tr><td><strong>Variação Saldo Bruto (R$)</strong></td>' +
        shockResults.map(r => {
          const sign = r.brutoDiff >= 0 ? '+' : '';
          const cls = r.brutoDiff >= 0 ? 'pos' : 'neg';
          return `<td style="text-align:center" class="${cls}">${sign}${fmtBRL(r.brutoDiff)}</td>`;
        }).join('') + '</tr>';

      // Linha 5: Rentabilidade Líquida Resultante (%)
      sHtml += '<tr><td><strong>Rentabilidade Líquida Total (%)</strong> ' + renderInfoTip('rentabilidadeLiq') + '</td>' +
        shockResults.map(r => {
          const sign = r.shockReturnPct >= 0 ? '+' : '';
          const cls = r.shockReturnPct >= 0 ? 'pos' : 'neg';
          return `<td style="text-align:center;font-weight:700" class="${cls}">${sign}${fmtPct(r.shockReturnPct)}</td>`;
        }).join('') + '</tr>';

      // Linha 6: Impacto na Rentabilidade (p.p.)
      sHtml += '<tr><td><strong>Impacto na Rentabilidade (p.p.)</strong></td>' +
        shockResults.map(r => {
          const sign = r.returnDiffPP >= 0 ? '+' : '';
          const cls = r.returnDiffPP >= 0 ? 'pos' : 'neg';
          return `<td style="text-align:center" class="${cls}">${sign}${fmtNum(r.returnDiffPP, 2)} p.p.</td>`;
        }).join('') + '</tr>';

      sHtml += '</tbody>';
      sensTable.innerHTML = sHtml;
    }

    // 3. Explicação de Duration Modificada
    if (durationExplanation) {
      durationExplanation.innerHTML = `
        <strong>Duration Modificada Estimada: ≈ ${fmtNum(duration, 1)} anos.</strong> Cada variação de 0,10 p.p. na taxa do título movimenta aproximadamente <strong>${fmtNum(duration * 0.1, 1)}%</strong> do seu valor de mercado. ${renderInfoTip('duration')}
      `;
    }
  }

  return { render };
}
