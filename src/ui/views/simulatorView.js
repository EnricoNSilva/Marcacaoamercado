/**
 * View: Simulador de Venda (Aba 2)
 * Controles de projeção, convergência, decomposição, tabela PEPS,
 * balões explicativos (?) e métricas completas de rentabilidade (% e TIR).
 */

import { fmtBRL, fmtPct, fmtNum, formatBRLDate } from '../format.js';
import { renderKpiCard } from '../components/kpiCard.js';
import { renderRateTrajectoryChart } from '../charts/rateTrajectoryChart.js';

export function createSimulatorView(store) {
  const simDateText = document.getElementById('simDateText');
  const simYearsDisplay = document.getElementById('simYearsDisplay');
  const targetRateDisplay = document.getElementById('targetRateDisplay');
  const convMonthsDisplay = document.getElementById('convMonthsDisplay');
  const ipcaDisplay = document.getElementById('ipcaDisplay');
  const simQtyDisplay = document.getElementById('simQtyDisplay');

  const simYearsSlider = document.getElementById('simYearsSlider');
  const targetRateSlider = document.getElementById('targetRateSlider');
  const convMonthsSlider = document.getElementById('convMonthsSlider');
  const ipcaSlider = document.getElementById('ipcaSlider');
  const simQtyInput = document.getElementById('simQtyInput');

  const simKpis = document.getElementById('simKpis');
  const simDecompBox = document.getElementById('simDecompBox');
  const simTableBody = document.querySelector('#simTable tbody');

  // Event Listeners dos Sliders
  if (simYearsSlider) {
    simYearsSlider.addEventListener('input', e => {
      store.setState({ simYears: Number(e.target.value) });
    });
  }
  if (targetRateSlider) {
    targetRateSlider.addEventListener('input', e => {
      store.setState({ targetRate: Number(e.target.value) });
    });
  }
  if (convMonthsSlider) {
    convMonthsSlider.addEventListener('input', e => {
      store.setState({ convMonths: Number(e.target.value) });
    });
  }
  if (ipcaSlider) {
    ipcaSlider.addEventListener('input', e => {
      store.setState({ ipca: Number(e.target.value) });
    });
  }
  if (simQtyInput) {
    simQtyInput.addEventListener('input', e => {
      store.setState({ simQty: e.target.value });
    });
  }

  // Presets
  const presetNow = document.getElementById('presetNow');
  const presetAvg = document.getElementById('presetAvg');
  const presetLowRate = document.getElementById('presetLowRate');
  const btnSellAll = document.getElementById('btnSellAll');

  if (presetNow) {
    presetNow.addEventListener('click', () => {
      const comp = store.getComputed();
      store.setState({ targetRate: Number((comp.rNow * 100).toFixed(2)) });
    });
  }
  if (presetAvg) {
    presetAvg.addEventListener('click', () => {
      const state = store.getState();
      const totalQ = state.lots.reduce((a, b) => a + b.qty, 0);
      const avg = totalQ > 0 ? (state.lots.reduce((a, b) => a + b.rate * b.qty, 0) / totalQ) : 6.55;
      store.setState({ targetRate: Number(avg.toFixed(2)) });
    });
  }
  if (presetLowRate) {
    presetLowRate.addEventListener('click', () => {
      store.setState({ targetRate: 5.0 });
    });
  }
  if (btnSellAll) {
    btnSellAll.addEventListener('click', () => {
      store.setState({ simQty: '' });
      if (simQtyInput) simQtyInput.value = '';
    });
  }

  function render(state, computed) {
    const {
      simDN,
      rateAtSale,
      simPU,
      simQtyNum,
      simRes,
      nowResForSoldQty,
      simLucroLiq,
      simReturnPct,
      simTIR,
      simDiffHoje,
      simLiqDeflacionado,
      decomposition
    } = computed;

    // Atualiza Displays
    if (simDateText) simDateText.textContent = formatBRLDate(simDN);
    if (simYearsDisplay) simYearsDisplay.textContent = `daqui a ${fmtNum(state.simYears, 1)} ano(s)`;
    if (targetRateDisplay) targetRateDisplay.textContent = `IPCA + ${fmtPct(state.targetRate / 100)}`;
    if (convMonthsDisplay) convMonthsDisplay.textContent = `${state.convMonths} meses`;
    if (ipcaDisplay) ipcaDisplay.textContent = `${fmtNum(state.ipca, 1)}% a.a.`;
    if (simQtyDisplay) simQtyDisplay.textContent = `${fmtNum(simQtyNum)} títulos`;

    if (simYearsSlider && Number(simYearsSlider.value) !== state.simYears) simYearsSlider.value = state.simYears;
    if (targetRateSlider && Number(targetRateSlider.value) !== state.targetRate) targetRateSlider.value = state.targetRate;
    if (convMonthsSlider && Number(convMonthsSlider.value) !== state.convMonths) convMonthsSlider.value = state.convMonths;
    if (ipcaSlider && Number(ipcaSlider.value) !== state.ipca) ipcaSlider.value = state.ipca;
    if (simQtyInput && simQtyInput.value !== String(state.simQty)) simQtyInput.value = state.simQty;

    // KPIs do Simulador com Rentabilidade % e Tooltips (?)
    if (simKpis) {
      const lucroSign = simLucroLiq >= 0 ? '+' : '';
      const lucroClass = simLucroLiq >= 0 ? 'pos' : 'neg';

      const retSign = simReturnPct >= 0 ? '+' : '';
      const retClass = simReturnPct >= 0 ? 'pos' : 'neg';

      const diffSign = simDiffHoje >= 0 ? '+' : '';
      const diffClass = simDiffHoje >= 0 ? 'pos' : 'neg';

      simKpis.innerHTML =
        renderKpiCard({
          label: 'PU Projetado',
          value: fmtBRL(simPU),
          sub: `Taxa Venda: IPCA + ${fmtPct(rateAtSale)}`,
          tooltipKey: 'puProjetado'
        }) +
        renderKpiCard({
          label: 'Saldo Líquido Projetado',
          value: fmtBRL(simRes.liqReal),
          sub: `em R$ de hoje: ${fmtBRL(simLiqDeflacionado)}`,
          valClass: 'pos',
          tooltipKey: 'saldoLiqProjetado'
        }) +
        renderKpiCard({
          label: 'Ganho Líquido Total',
          value: `${lucroSign}${fmtBRL(simLucroLiq)}`,
          sub: `${fmtBRL(simRes.custo)} custo resgatado`,
          valClass: lucroClass,
          tooltipKey: 'ganhoLiqTotal'
        }) +
        renderKpiCard({
          label: 'Rentabilidade Projetada %',
          value: `${retSign}${fmtPct(simReturnPct)}`,
          sub: `TIR Projetada: ${fmtPct(simTIR)} a.a.`,
          valClass: retClass,
          tooltipKey: 'rentabilidadeSim'
        }) +
        renderKpiCard({
          label: 'Comparado a Vender Hoje',
          value: `${diffSign}${fmtBRL(simDiffHoje)}`,
          sub: `Hoje você teria ${fmtBRL(nowResForSoldQty.liqReal)}`,
          valClass: diffClass,
          tooltipKey: 'comparadoHoje'
        });
    }

    // Box de Decomposição com Valores em R$ e %
    if (simDecompBox) {
      const mtmSign = decomposition.ganhoMarcacao >= 0 ? '+' : '';
      const mtmClass = decomposition.ganhoMarcacao >= 0 ? 'pos' : 'neg';
      const pctCarrego = fmtPct(decomposition.pctCarrego, 1);
      const pctMtm = fmtPct(decomposition.pctMarcacao, 1);

      simDecompBox.innerHTML = `
        <div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:14px;">
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.6">
            Ganho Bruto Total de <strong>${fmtBRL(decomposition.ganhoBrutoTotal)}</strong> composto por:<br>
            • <strong class="pos">${fmtBRL(decomposition.ganhoCarrego)} de Carrego Puro (${pctCarrego} do ganho):</strong> juros contratados de cada lote corrigidos pelo IPCA.<br>
            • <strong class="${mtmClass}">${mtmSign}${fmtBRL(decomposition.ganhoMarcacao)} de Marcação a Mercado (${pctMtm} do ganho):</strong> impacto da oscilação da taxa de mercado para IPCA + ${fmtPct(rateAtSale)}.
          </div>
        </div>
      `;
    }

    // Tabela PEPS de Liquidação com Rentabilidade %
    if (simTableBody) {
      simTableBody.innerHTML = '';
      simRes.parts.forEach(p => {
        const tr = document.createElement('tr');
        const lucroLote = p.liqReal - p.custo;
        const lucroSign = lucroLote >= 0 ? '+' : '';
        const lucroClass = lucroLote >= 0 ? 'pos' : 'neg';

        const pctLote = p.custo > 0 ? (lucroLote / p.custo) : 0;
        const pctSign = pctLote >= 0 ? '+' : '';
        const pctClass = pctLote >= 0 ? 'pos' : 'neg';

        tr.innerHTML = `
          <td>${formatBRLDate(p.lot.dn)}</td>
          <td>IPCA + ${fmtPct(p.lot.rate / 100)}</td>
          <td>${fmtNum(p.q)}</td>
          <td>${fmtBRL(p.custo)}</td>
          <td>${fmtBRL(p.bruto)}</td>
          <td>${fmtBRL(p.cust)}</td>
          <td>${fmtBRL(p.ir)}</td>
          <td class="pos" style="font-weight:700">${fmtBRL(p.liqReal)}</td>
          <td class="${lucroClass} tabular-nums">${lucroSign}${fmtBRL(lucroLote)}</td>
          <td class="${pctClass} tabular-nums" style="font-weight:600">${pctSign}${fmtPct(pctLote)}</td>
        `;
        simTableBody.appendChild(tr);
      });
    }

    // Gráfico de Trajetória da Taxa
    renderRateTrajectoryChart('rateTrajectoryChart', state, computed);
  }

  return { render };
}
