/**
 * Glossário Explicativo de Termos e Métricas Financeiras
 * Textos educativos para apoiar os balões informativos de IHC.
 */

export const GLOSSARY = {
  puResgate: 'Preço Unitário que o Tesouro Direto paga hoje pela recompra de 1 título na venda antecipada.',
  taxaHoje: 'Taxa real anual negociada a mercado pelo Tesouro Direto na data de referência.',
  totalInvestido: 'Soma do valor financeiro de desembolso em todas as suas compras (custo histórico de aquisição).',
  saldoBruto: 'Valor total atual da carteira a mercado antes de qualquer dedução tributária ou taxa (Quantidade × PU de Resgate).',
  saldoLiqApp: 'Valor exibido no Extrato Oficial do app do Tesouro Direto. Deduz o IR regressivo sobre o ganho de capital, sem abater a custódia da B3.',
  saldoLiqReal: 'Valor líquido efetivo que cai na sua conta na venda antecipada, deduzindo tanto o IR regressivo quanto a taxa de custódia da B3 pro rata die.',
  irRetido: 'Imposto de Renda retido na fonte conforme a tabela regressiva da renda fixa (de 22,5% a 15%), calculado lote a lote.',
  custodiaB3: 'Taxa cobrada pela B3 na venda antecipada de títulos RENDA+. No resgate no vencimento até 6 salários mínimos mensais, é isenta.',
  rentabilidadeLiq: 'Percentual de valorização líquida sobre o capital investido: (Líquido ÷ Investido) − 1.',
  tir: 'Taxa Interna de Retorno anualizada equivalente, considerando os dias exatos em que cada compra foi realizada.',
  carregoPuro: 'Ganho acumulado apenas pela passagem do tempo, rentabilizando os juros contratados em cada compra somados à inflação (IPCA).',
  marcacaoMercado: 'Ganho ou perda decorrente da oscilação da taxa de juros do mercado em relação à taxa contratada na compra.',
  duration: 'Sensibilidade do preço do título às oscilações da taxa de juros. Quanto maior a duration, maior a valorização na queda dos juros.',
  taxaEmpate: 'Taxa máxima de juros de mercado em que você ainda não teria prejuízo financeiro ao vender antecipadamente.',
  spread: 'Diferença entre a taxa de aplicação (compra) e a taxa de resgate (venda) praticada pelo Tesouro Nacional.',
  convergencia: 'Período em meses durante o qual a taxa de juros do mercado se desloca gradualmente da taxa atual até a taxa projetada.'
};
