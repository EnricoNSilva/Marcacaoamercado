/**
 * Estado Inicial Padrão do Simulador RENDA+ 2065
 * Calibrado com os 4 lotes reais e dados oficiais do Tesouro Direto em 05/10/2026.
 */

export const DEFAULT_LOTS = [
  { id: 'lot-1', date: '2026-01-23', rate: 6.99, price: 185.02, qty: 25.35 },
  { id: 'lot-2', date: '2026-03-24', rate: 7.14, price: 177.03, qty: 56.48 },
  { id: 'lot-3', date: '2026-06-08', rate: 7.27, price: 172.89, qty: 28.92 },
  { id: 'lot-4', date: '2026-07-30', rate: 7.37, price: 168.02, qty: 29.58 }
];

export const DEFAULT_STATE = {
  // Calibração e Mercado Hoje
  selectedBond: 'tesouro-renda-mais-2065',
  brapiToken: '',
  refDate: '2026-10-05',
  refPrice: 243.38,
  refRate: '',        // Vazio para estimar automaticamente (~6,55% a.a.)
  spread: 0.0,        // Spread compra/venda em p.p.
  ipcaCal: 4.5,       // IPCA histórico recente da última compra até hoje (% a.a.)
  selic: 10.75,       // Taxa Selic / CDI de referência (% a.a.) para benchmark

  // Parâmetros de Projeção Futura
  ipca: 4.5,          // IPCA projetado para o futuro (% a.a.)
  targetRate: 6.55,   // Taxa real futura desejada (% a.a.)
  convMonths: 24,     // Tempo para convergir até a taxa alvo (meses)
  simYears: 1.0,      // Horizonte de venda (anos)
  simQty: '',         // Quantidade a vender (vazio = vender tudo)

  // Custódia B3
  custMode: 'single', // 'single' (faixa do prazo total) | 'marginal' | 'none'
  cust1: 0.50,        // Até 10 anos (% a.a.)
  cust2: 0.20,        // De 10 a 20 anos (% a.a.)
  cust3: 0.10,        // Acima de 20 anos (% a.a.)

  // Visualização e Gráficos
  chartMetric: 'liq', // 'liq' | 'bruto'
  chartReal: 'nom',   // 'nom' | 'real'
  chartHorizonYears: 10, // Horizonte configurável do gráfico (anos)

  // Lotes de Aquisição
  lots: DEFAULT_LOTS
};
