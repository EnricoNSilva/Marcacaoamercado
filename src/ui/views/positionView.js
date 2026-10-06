/**
 * View: Posição Atual (Aba 1)
 * Detalhamento centavo por centavo, conferência com extrato e gestão de lotes por ID.
 */

import { fmtBRL, fmtPct, fmtNum, formatBRLDate } from '../format.js';
import { renderKpiCard } from '../components/kpiCard.js';

export function createPositionView(store) {
  const kpisContainer = document.getElementById('posKpis');
  const tableBody = document.querySelector('#lotsTable tbody');
  const btnAddLot = document.getElementById('btnAddLot');
  const btnResetData = document.getElementById('btnResetData');

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
    const { posRes, posLucroApp, pNow } = computed;

    // 1. Renderiza KPIs
    if (kpisContainer) {
      const avgPrice = posRes.q > 0 ? (posRes.custo / posRes.q) : 0;
      const lucroSign = posLucroApp >= 0 ? '+' : '';
      const lucroClass = posLucroApp >= 0 ? 'pos' : 'neg';
      const pctLucro = posRes.custo > 0 ? (posLucroApp / posRes.custo) : 0;

      kpisContainer.innerHTML =
        renderKpiCard({
          label: 'Total Investido',
          value: fmtBRL(posRes.custo),
          sub: `${fmtNum(posRes.q)} títulos · PM ${fmtBRL(avgPrice)}`
        }) +
        renderKpiCard({
          label: 'Saldo Bruto Atual',
          value: fmtBRL(posRes.bruto),
          sub: `PU de Resgate ${fmtBRL(pNow)}`
        }) +
        renderKpiCard({
          label: 'Saldo Líquido (App)',
          value: fmtBRL(posRes.liqApp),
          sub: `Lucro ${lucroSign}${fmtBRL(posLucroApp)} (${fmtPct(pctLucro)})`,
          valClass: lucroClass
        }) +
        renderKpiCard({
          label: 'Líquido Real (pós Custódia)',
          value: fmtBRL(posRes.liqReal),
          sub: `Custódia B3 retida: ${fmtBRL(posRes.cust)}`,
          valClass: 'pos'
        }) +
        renderKpiCard({
          label: 'IR Total Retido',
          value: fmtBRL(posRes.bruto - posRes.liqApp),
          sub: 'Alíquotas de 20% a 22,5%'
        });
    }

    // 2. Renderiza Tabela de Lotes
    if (tableBody) {
      tableBody.innerHTML = '';

      // Exibe os lotes mais recentes em cima
      posRes.parts.slice().reverse().forEach(p => {
        const tr = document.createElement('tr');
        const lotId = p.lot.id;

        tr.innerHTML = `
          <td>${formatBRLDate(p.lot.dn)}</td>
          <td>IPCA + ${fmtPct(p.lot.rate / 100)}</td>
          <td>${fmtBRL(p.lot.price)}</td>
          <td>
            <input type="number" step="0.01" min="0.01" value="${p.q}" data-lot-id="${lotId}" class="lot-qty-input" />
          </td>
          <td>${fmtBRL(p.custo)}</td>
          <td>${p.days} d</td>
          <td>${fmtBRL(p.bruto)}</td>
          <td>${fmtBRL(p.cust)}</td>
          <td>${fmtBRL(p.bruto - p.liqApp)} <span class="badge badge-neutral">${fmtPct(p.irAliq, 1)}</span></td>
          <td class="pos tabular-nums" style="font-weight:700">${fmtBRL(p.liqApp)}</td>
          <td>
            <button class="btn btn-danger-outline btn-sm" data-remove-id="${lotId}">Excluir</button>
          </td>
        `;

        tableBody.appendChild(tr);
      });

      // Linha de Totais Consolidados
      const totalRow = document.createElement('tr');
      totalRow.className = 'total-row';
      totalRow.innerHTML = `
        <td>Total</td>
        <td>--</td>
        <td>--</td>
        <td>${fmtNum(posRes.q)}</td>
        <td>${fmtBRL(posRes.custo)}</td>
        <td>--</td>
        <td>${fmtBRL(posRes.bruto)}</td>
        <td>${fmtBRL(posRes.cust)}</td>
        <td>${fmtBRL(posRes.bruto - posRes.liqApp)}</td>
        <td class="pos" style="font-size:14px">${fmtBRL(posRes.liqApp)}</td>
        <td>--</td>
      `;
      tableBody.appendChild(totalRow);

      // Event Listeners dos Lotes (B3 e B4)
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
