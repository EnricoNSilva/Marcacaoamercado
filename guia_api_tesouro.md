# Guia Definitivo: Criando sua Própria API Gratuita do Tesouro Direto

Como as APIs do mercado passaram a cobrar pelo Tesouro Direto e o endpoint JSON oficial saiu do ar, nós vamos usar a "fonte matriz": o portal oficial de **Dados Abertos do Tesouro Transparente**. 

Lá existe um arquivo CSV público atualizado diariamente pelo governo. A única desvantagem é que ele é gigantesco (contém todo o histórico desde os anos 2000), então não podemos baixá-lo diretamente no celular toda vez que abrirmos o app.

A solução profissional é usar o **GitHub Actions**: criamos um "robozinho" que roda escondido num servidor da Microsoft todo dia de manhã, baixa o arquivo pesado, extrai **apenas** os dados de hoje, formata no padrão que o nosso app já conhece (igual ao da Brapi), e publica num arquivo JSON levinho de 5KB no seu **GitHub Pages**. Tudo 100% gratuito.

---

## 1. O Código Extrator (`scraper.cjs`)

Primeiro, você deve criar um arquivo chamado `scraper.cjs` na raiz do seu projeto (junto com o `package.json`). Eu já criei e testei ele na sua máquina! O código completo que faz a mágica de baixar e filtrar o CSV é este:

```javascript
// scraper.cjs
const https = require('https');
const fs = require('fs');

const url = 'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const lines = data.split('\n');
    
    const rows = lines.slice(1).filter(l => l.trim()).map(l => {
      const parts = l.split(';');
      return {
        tipo: parts[0],
        vencimento: parts[1],
        dataBase: parts[2],
        taxaCompra: parseFloat(parts[3].replace(',', '.')),
        taxaVenda: parseFloat(parts[4].replace(',', '.')),
        puCompra: parseFloat(parts[5].replace(',', '.')),
        puVenda: parseFloat(parts[6].replace(',', '.')),
      };
    });

    // Converte DD/MM/YYYY para Date para acharmos o dia mais recente
    const parseDate = (d) => {
      const [day, month, year] = d.split('/');
      return new Date(`${year}-${month}-${day}T00:00:00Z`);
    };

    let latestDate = null;
    let maxTime = 0;
    rows.forEach(r => {
      if (!r.dataBase) return;
      const t = parseDate(r.dataBase).getTime();
      if (t > maxTime) {
        maxTime = t;
        latestDate = r.dataBase;
      }
    });

    // Filtra para pegar apenas os títulos da data de hoje/mais recente
    const currentBonds = rows.filter(r => r.dataBase === latestDate);

    // Formata o JSON exatamente como o nosso App espera (Padrão Brapi)
    const results = currentBonds.map(b => {
      const year = b.vencimento.split('/')[2];
      
      let symbolBase = b.tipo.toLowerCase()
        .replace(/\+/g, 'mais')
        .replace(/ aposentadoria extra/g, '')
        .replace(/ com juros semestrais/g, '-juros-semestrais')
        .replace(/ /g, '-');
      
      let symbol = `${symbolBase}-${year}`;
      
      if (b.tipo === 'Tesouro Selic') {
        const [d, m, y] = b.vencimento.split('/');
        symbol = `tesouro-selic-${d}${m}${y}`;
      }

      return {
        symbol: symbol,
        name: `${b.tipo} ${year}`,
        bondType: b.tipo,
        indexer: b.tipo.includes('Selic') ? 'selic' : b.tipo.includes('Prefixado') ? 'prefixado' : 'ipca',
        sellRate: b.taxaCompra,
        buyRate: b.taxaVenda,
        sellPrice: b.puCompra,
        buyPrice: b.puVenda,
        baseDate: b.dataBase.split('/').reverse().join('-')
      };
    });

    // Salva o resultado
    fs.writeFileSync('bonds.json', JSON.stringify({ results }, null, 2));
    console.log(`Sucesso: ${results.length} títulos processados para a data ${latestDate}`);
  });
});
```

---

## 2. A Automação do GitHub Actions

Para o GitHub rodar esse script sozinho todo dia e hospedar o JSON, precisamos criar um "Workflow".

1. Crie uma pasta oculta no seu repositório chamada `.github/workflows`.
2. Dentro dela, crie um arquivo chamado `api-tesouro.yml`.
3. Cole o seguinte código dentro dele:

```yaml
name: Atualizar API Tesouro Direto

# Executa todos os dias úteis às 11:30 (UTC) que é 08:30 no Brasil
# E permite rodar manualmente (workflow_dispatch)
on:
  schedule:
    - cron: '30 11 * * 1-5'
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout do Repositório
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Executar o Scraper
        run: node scraper.cjs

      - name: Configurar GitHub Pages
        uses: actions/configure-pages@v4

      # Salva o arquivo gerado (bonds.json) para o Pages ler
      - name: Upload Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.' # Aqui você pode filtrar se quiser, por enquanto envia tudo

      - name: Publicar no GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 3. Passo a Passo para Ativar

1. Suba (faça **Commit** e **Push**) da sua pasta inteira (com o `scraper.cjs` e a pasta `.github/workflows`) para um repositório no seu GitHub.
2. No seu repositório do GitHub, vá em **Settings (Configurações)** > **Pages**.
3. Em *Build and deployment*, mude a *Source* para **GitHub Actions**.
4. Agora vá na aba **Actions** lá em cima. Você verá o seu workflow "Atualizar API Tesouro Direto". 
5. Clique nele e selecione a opção **Run workflow** (Rodar manualmente pela primeira vez).
6. Espere terminar (leva uns 15 segundos).
7. Quando terminar, seu arquivo JSON novinho em folha estará vivo na internet em um link parecido com este:
   `https://[SEU-USUARIO].github.io/[SEU-REPOSITORIO]/bonds.json`

## 4. O Gran Finale: Conectar no nosso App!

Agora que você tem o link, a última coisa é ir no nosso código `src/core/api.js`.

Você vai achar o bloco 1 (onde ele tenta buscar o token da brapi) e o bloco 2 (sandbox). Nós vamos adicionar a nossa nova super-API como a **Prioridade de Busca**:

Altere o fetch para consumir o seu novo link:
```javascript
const res = await fetch(`https://SEU-USUARIO.github.io/SEU-REPO/bonds.json`);
```

E voilà! Você construiu uma API resiliente baseada em Dados Abertos e cortou de vez a necessidade de pagar 140 reais mensais para sistemas terceiros!

