/**
 * View: Posição Atual (Aba 1)
 * Detalhamento centavo por centavo, conferência com extrato, gestão de lotes por ID,
 * balões explicativos (?) e métricas completas de rentabilidade (%).
 */

import { fmtBRL, fmtPct, fmtNum, formatBRLDate } from '../format.js';
import { renderKpiCard } from '../components/kpiCard.js';
import { renderAllocationChart } from '../charts/allocationChart.js';
import { getIRSchedule } from '../../core/index.js';

export function createPositionView(store) {
  const kpisContainer = document.getElementById('posKpis');
  const tableBody = document.querySelector('#lotsTable tbody');
  const btnAddLot = document.getElementById('btnAddLot');
  const btnResetData = document.getElementById('btnResetData');
  const modeSelect = document.getElementById('allocationModeSelect');

  let currentAllocationMode = 'indexer';

  if (modeSelect) {
    modeSelect.addEventListener('change', (e) => {
      currentAllocationMode = e.target.value;
      renderAllocationChart('allocationChart', store.getState(), store.getComputed(), currentAllocationMode);
    });
  }

  if (btnAddLot) {
    btnAddLot.addEventListener('click', () => {
      const state = store.getState();
      const comp = store.getComputed();
      store.addLot({
        date: state.refDate,
        rate: Number((comp.rNow * 100).toFixed(2)),
        price: comp.pNow,
        qty: 10
      });
    });
  }

  if (btnResetData) {
    btnResetData.addEventListener('click', () => {
      if (confirm('Restaurar todos os dados e lotes para o padrão oficial?')) {
        store.resetToDefaults();
      }
    });
  }

  function render(state, computed) {
    const {
      posRes,
      posLucroReal,
      posReturnPctReal,
      posRealReturnPct,
      posAvgRate,
      posTIR,
      pNow,
      rNow
    } = computed;

    const avgPrice = posRes.q > 0 ? (posRes.custo / posRes.q) : 0;

    // 1. Renderiza KPIs com Tooltips (?) e Rentabilidade %
    if (kpisContainer) {
      const lucroRealSign = posLucroReal >= 0 ? '+' : '';
      const lucroRealClass = posLucroReal >= 0 ? 'pos' : 'neg';
      const returnRealSign = posReturnPctReal >= 0 ? '+' : '';
      const irTotal = posRes.bruto - posRes.liqApp;

      kpisContainer.innerHTML =
        renderKpiCard({
          label: 'Total Investido',
          value: fmtBRL(posRes.custo),
          sub: `${fmtNum(posRes.q)} títulos · PM ${fmtBRL(avgPrice)}`,
          tooltipKey: 'totalInvestido'
        }) +
        renderKpiCard({
          label: 'Saldo Bruto Atual',
          value: fmtBRL(posRes.bruto),
          sub: `PU de Resgate ${fmtBRL(pNow)}`,
          tooltipKey: 'saldoBruto'
        }) +
        renderKpiCard({
          label: 'Taxa Média de Compra',
          value: `IPCA + ${fmtPct(posAvgRate / 100)}`,
          sub: `Mercado hoje: IPCA + ${fmtPct(rNow)}`,
          tooltipKey: 'taxaMediaCompra'
        }) +
        renderKpiCard({
          label: 'Líquido Real (pós Custódia)',
          value: fmtBRL(posRes.liqReal),
          sub: `Lucro Líquido: ${lucroRealSign}${fmtBRL(posLucroReal)} (após IR e B3)`,
          valClass: lucroRealClass,
          tooltipKey: 'saldoLiqReal'
        }) +
        renderKpiCard({
          label: 'Rentabilidade Líquida %',
          value: `${returnRealSign}${fmtPct(posReturnPctReal)}`,
          sub: `TIR ≈ ${fmtPct(posTIR)} a.a. · Real: ${fmtPct(posRealReturnPct)}`,
          valClass: lucroRealClass,
          tooltipKey: 'rentabilidadeLiq'
        }) +
        renderKpiCard({
          label: 'IR Total Retido',
          value: fmtBRL(irTotal),
          sub: `Alíquotas 20%–22,5% · Custódia B3: ${fmtBRL(posRes.cust)}`,
          tooltipKey: 'irRetido'
        });
    }

    // 2. Renderiza Gráfico de Alocação (Donut Chart)
    renderAllocationChart('allocationChart', state, computed, currentAllocationMode);

    // 3. Renderiza Tabela de Lotes com Rentab. % por lote
    if (tableBody) {
      tableBody.innerHTML = '';

      posRes.parts.slice().reverse().forEach(p => {
        const tr = document.createElement('tr');
        const lotId = p.lot.id;
        const lucroLote = p.liqApp - p.custo;
        const pctLote = p.custo > 0 ? (lucroLote / p.custo) : 0;
        const loteSign = pctLote >= 0 ? '+' : '';
        const loteClass = pctLote >= 0 ? 'pos' : 'neg';

        const sched = getIRSchedule(p.days);
        const irNextBadge = sched.nextRate
          ? `<span class="badge" style="background:var(--semantic-info-bg);color:var(--semantic-info);font-size:10px;" title="${sched.daysRemaining} dias para a alíquota cair para ${fmtPct(sched.nextRate, 1)}">⏳ ${sched.statusText}</span>`
          : `<span class="badge" style="background:var(--semantic-success-bg);color:var(--semantic-success);font-size:10px;">⭐ Mín. 15%</span>`;

        tr.innerHTML = `
          <td data-label="Data Compra">${formatBRLDate(p.lot.dn)}</td>
          <td data-label="Taxa Compra">IPCA + ${fmtPct(p.lot.rate / 100)}</td>
          <td data-label="PU Compra">${fmtBRL(p.lot.price)}</td>
          <td data-label="Qtd. Títulos">
            <input type="number" step="0.01" min="0.01" value="${p.q}" data-lot-id="${lotId}" class="lot-qty-input" />
          </td>
          <td data-label="Valor Investido">${fmtBRL(p.custo)}</td>
          <td data-label="Dias Decorridos">${p.days} d</td>
          <td data-label="Valor Bruto">${fmtBRL(p.bruto)}</td>
          <td data-label="Custódia B3">${fmtBRL(p.cust)}</td>
          <td data-label="IR Retido">
            <div>${fmtBRL(p.bruto - p.liqApp)}</div>
            <div style="margin-top:3px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
              <span class="badge badge-neutral">${fmtPct(p.irAliq, 1)}</span>
              ${irNextBadge}
            </div>
          </td>
          <td data-label="Líquido (App)" class="pos tabular-nums" style="font-weight:700">${fmtBRL(p.liqApp)}</td>
          <td data-label="Rentab. %" class="${loteClass} tabular-nums" style="font-weight:600">${loteSign}${fmtPct(pctLote)}</td>
          <td data-label="Ações">
            <button class="btn btn-danger-outline btn-sm" data-remove-id="${lotId}">Excluir</button>
          </td>
        `;

        tableBody.appendChild(tr);
      });

      // Linha de Totais Consolidados com Rentab. % Total
      const totalLucro = posRes.liqApp - posRes.custo;
      const totalPct = posRes.custo > 0 ? (totalLucro / posRes.custo) : 0;
      const totalSign = totalPct >= 0 ? '+' : '';
      const totalClass = totalPct >= 0 ? 'pos' : 'neg';

      const totalRow = document.createElement('tr');
      totalRow.className = 'total-row';
      totalRow.innerHTML = `
        <td data-label="Resumo">Total</td>
        <td data-label="Taxa Média">IPCA + ${fmtPct(posAvgRate / 100)}</td>
        <td data-label="Preço Médio">${fmtBRL(avgPrice)}</td>
        <td data-label="Qtd. Total">${fmtNum(posRes.q)}</td>
        <td data-label="Investido Total">${fmtBRL(posRes.custo)}</td>
        <td data-label="Dias">--</td>
        <td data-label="Bruto Total">${fmtBRL(posRes.bruto)}</td>
        <td data-label="Custódia Total">${fmtBRL(posRes.cust)}</td>
        <td data-label="IR Retido Total">${fmtBRL(posRes.bruto - posRes.liqApp)}</td>
        <td data-label="Líquido Total" class="pos" style="font-size:14px">${fmtBRL(posRes.liqApp)}</td>
        <td data-label="Rentab. Total" class="${totalClass}" style="font-size:14px;font-weight:700">${totalSign}${fmtPct(totalPct)}</td>
        <td data-label="Ações">--</td>
      `;
      tableBody.appendChild(totalRow);

      // Event Listeners dos Lotes
      tableBody.querySelectorAll('[data-remove-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-remove-id');
          try {
            store.removeLot(id);
          } catch (e) {
            alert(e.message);
          }
        });
      });

      tableBody.querySelectorAll('.lot-qty-input').forEach(inp => {
        inp.addEventListener('change', () => {
          const id = inp.getAttribute('data-lot-id');
          const val = Number(inp.value);
          if (val > 0) {
            store.updateLot(id, { qty: val });
          }
        });
      });
    }
  }

  return { render };
}
