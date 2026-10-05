"""
Simulação Tesouro RendA+ 2065 (NTN-B1) — marcação a mercado + carrego.

Mesmo modelo do simulador web (index.html):
  PU(t, r) = F(t) * sum_k (1 + r) ** (-du(t, T_k) / 252)
  - T_k: 240 parcelas mensais (dia 15 ou próximo dia útil) de jan/2065 a dez/2084
  - F(t): fator proporcional ao VNA (cresce com o IPCA), calibrado pelo preço/taxa de hoje
  - du: dias úteis com feriados nacionais (calendário ANBIMA)
  - IR regressivo por lote (22,5%, 20%, 17,5%, 15%)
  - Custódia B3 regressiva pro rata die (0,50% até 10a, 0,20% 10-20a, 0,10% >20a)
  - IOF (< 30 dias)
"""
from datetime import date, timedelta
import math

import pandas as pd

# ------------------------- DADOS (calibrados) -------------------------
DATA_REF = date(2026, 10, 5)
PRECO_HOJE = 243.38          # PU de resgate atual (resulta no valor bruto de R$ 34.153,50)
TAXA_HOJE = None             # taxa de resgate atual (ex.: 0.0655). None = calculada pelo modelo
IPCA = 0.045                 # IPCA projetado a.a.
LOTES = [  # (data, taxa de compra, preço, quantidade)
    (date(2026, 1, 23), 0.0699, 185.02, 25.35),
    (date(2026, 3, 24), 0.0714, 177.03, 56.48),
    (date(2026, 6, 8), 0.0727, 172.89, 28.92),
    (date(2026, 7, 30), 0.0737, 168.02, 29.58),
]
ANOS_SEGURAR = [0, 1, 2, 3, 5, 10, 15, 20]
TAXAS_MERCADO = [0.05, 0.055, 0.06, 0.065, 0.07, 0.075, 0.08]

# ------------------------- CALENDÁRIO -------------------------
def _pascoa(y):
    a = y % 19; b = y // 100; c = y % 100; d = b // 4; e = b % 4; f = (b + 8) // 25; g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30; i = c // 4; k = c % 4; l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    return date(y, (h + l - 7 * m + 114) // 31, ((h + l - 7 * m + 114) % 31) + 1)

_FER = set()
for _y in range(2000, 2091):
    _FER |= {date(_y, m, d) for m, d in [(1, 1), (4, 21), (5, 1), (9, 7), (10, 12), (11, 2), (11, 15), (12, 25)]}
    if _y >= 2024:
        _FER.add(date(_y, 11, 20))
    _p = _pascoa(_y)
    _FER |= {_p - timedelta(48), _p - timedelta(47), _p - timedelta(2), _p + timedelta(60)}

_D0 = date(2000, 1, 1)
_CUM = [0]
for _i in range((date(2090, 12, 31) - _D0).days + 1):
    _d = _D0 + timedelta(_i)
    _CUM.append(_CUM[-1] + (1 if _d.weekday() < 5 and _d not in _FER else 0))

def du(a, b):
    return _CUM[(b - _D0).days] - _CUM[(a - _D0).days]

def _prox_util(d):
    while d.weekday() >= 5 or d in _FER:
        d += timedelta(1)
    return d

def add_anos(d, anos):
    try:
        return d.replace(year=d.year + anos)
    except ValueError:
        return d.replace(year=d.year + anos, day=28)

# ------------------------- MODELO -------------------------
FLUXOS = [_prox_util(date(2065 + k // 12, k % 12 + 1, 15)) for k in range(240)]
T1 = FLUXOS[0]
_DK = [du(T1, f) for f in FLUXOS]

def A(t, r):
    return (1 + r) ** (-du(t, T1) / 252) * sum((1 + r) ** (-d / 252) for d in _DK)

def trunc2(x):
    return math.floor(x * 100 + 1e-7) / 100

def _calibrar():
    if TAXA_HOJE is not None:
        return PRECO_HOJE / A(DATA_REF, TAXA_HOJE), TAXA_HOJE
    d, r, p, _ = max(LOTES, key=lambda l: l[0])
    f_ref = p / A(d, r) * (1 + IPCA) ** (du(d, DATA_REF) / 252)
    lo, hi = -0.05, 0.35
    for _ in range(80):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if f_ref * A(DATA_REF, m) > PRECO_HOJE else (lo, m)
    r_hoje = (lo + hi) / 2
    return PRECO_HOJE / A(DATA_REF, r_hoje), r_hoje

F_REF, R_HOJE = _calibrar()

def PU(t, r):
    if t == DATA_REF and abs(r - R_HOJE) < 1e-12:
        return PRECO_HOJE
    return trunc2(F_REF * (1 + IPCA) ** (du(DATA_REF, t) / 252) * A(t, r))

def aliquota_ir(dias):
    return 0.225 if dias <= 180 else 0.20 if dias <= 360 else 0.175 if dias <= 720 else 0.15

def taxa_custodia_b3(valor, dias):
    """Regra regressiva B3 pro rata die sobre o valor bruto resgatado."""
    if dias <= 0 or valor <= 0:
        return 0.0
    aliq = 0.005 if dias <= 3652.5 else 0.002 if dias <= 7305 else 0.001
    return trunc2(valor * aliq * dias / 365.0)

_IOF = [96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0]

def vender_tudo(t, r=None):
    """Vende todos os lotes em t. r=None -> carrego (cada lote à sua taxa de compra)."""
    tot = dict(investido=0.0, bruto=0.0, custodia=0.0, ir=0.0, iof=0.0, liquido=0.0, liquido_sem_cust=0.0)
    for d, tx, p, q in LOTES:
        if d > t:
            continue
        bruto = trunc2(q * PU(t, tx if r is None else r))
        custo = trunc2(q * p)
        dias = (t - d).days
        cust = taxa_custodia_b3(bruto, dias)
        ganho = bruto - custo - cust
        iof = trunc2(ganho * _IOF[max(dias, 1) - 1] / 100) if ganho > 0 and dias < 30 else 0.0
        base = ganho - iof
        ir = trunc2(base * aliquota_ir(dias)) if base > 0 else 0.0
        
        # cálculo estilo app (sem deduzir custódia)
        g_app = bruto - custo
        ir_app = trunc2(g_app * aliquota_ir(dias)) if g_app > 0 else 0.0
        liq_app = bruto - ir_app - iof
        
        tot["investido"] += custo
        tot["bruto"] += bruto
        tot["custodia"] += cust
        tot["ir"] += ir
        tot["iof"] += iof
        tot["liquido"] += (bruto - cust - ir - iof)
        tot["liquido_sem_cust"] += liq_app
    return tot

def gerar_dataframe():
    linhas = []
    for anos in ANOS_SEGURAR:
        t = min(add_anos(DATA_REF, anos), T1 - timedelta(1))
        for nome, r in [("Carrego", None)] + [(f"IPCA + {x*100:.2f}%", x) for x in TAXAS_MERCADO]:
            v = vender_tudo(t, r)
            linhas.append({
                "Anos": anos,
                "Data venda": t.strftime("%d/%m/%Y"),
                "Cenário": nome,
                "Investido (R$)": round(v["investido"], 2),
                "Bruto (R$)": round(v["bruto"], 2),
                "Custódia B3 (R$)": round(v["custodia"], 2),
                "IR+IOF (R$)": round(v["ir"] + v["iof"], 2),
                "Líquido Real (R$)": round(v["liquido"], 2),
                "Líquido App (R$)": round(v["liquido_sem_cust"], 2),
                "Ganho líquido (%)": round((v["liquido"] / v["investido"] - 1) * 100, 2),
            })
    return pd.DataFrame(linhas)

def export_para_excel(df, path="simulacao.xlsx"):
    with pd.ExcelWriter(path, engine="xlsxwriter") as w:
        params_df = pd.DataFrame({
            "Parâmetro": ["Data ref.", "PU hoje (R$)", "Taxa implícita hoje", "IPCA proj. a.a.", "Custódia B3"],
            "Valor": [DATA_REF.isoformat(), PRECO_HOJE, f"{R_HOJE*100:.3f}%", f"{IPCA*100:.2f}%", "Regressiva (0,50% / 0,20% / 0,10%)"]
        })
        params_df.to_excel(w, sheet_name="Parametros", index=False)
        df.to_excel(w, sheet_name="Resultados", index=False)
        w.sheets["Resultados"].set_column(0, 9, 18)
    print(f"Arquivo Excel gerado com sucesso: {path}")

if __name__ == "__main__":
    print(f"Taxa implícita de resgate hoje: IPCA + {R_HOJE*100:.3f}%")
    hoje = vender_tudo(DATA_REF, R_HOJE)
    print(f"Hoje -> Bruto: R$ {hoje['bruto']:.2f} | IR (App): R$ {hoje['bruto']-hoje['liquido_sem_cust']:.2f} | Líquido (App): R$ {hoje['liquido_sem_cust']:.2f}")
    print(f"        Custódia B3: R$ {hoje['custodia']:.2f} | Líquido final na conta: R$ {hoje['liquido']:.2f}\n")
    df = gerar_dataframe()
    print(df.head(15).to_string(index=False))
    export_para_excel(df, "simulacao.xlsx")
