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

    const currentBonds = rows.filter(r => r.dataBase === latestDate);

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

    fs.writeFileSync('bonds.json', JSON.stringify({ results }, null, 2));
    console.log(`Sucesso: ${results.length} títulos processados para a data ${latestDate}`);
  });
});
