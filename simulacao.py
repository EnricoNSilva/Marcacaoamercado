import pandas as pd
import xlsxwriter
from datetime import date
from xlsxwriter.utility import xl_rowcol_to_cell

# Dados do título (valores usados na simulação — editáveis no Excel gerado)
PU_inicial = 168.67
tx_compra = 0.0719
data_compra = date(2026, 1, 23)
data_vencimento = date(2084, 12, 15)
# Divide por 365.25 para considerar anos bissextos na média
anos_total = (data_vencimento - data_compra).days / 365.25
# Cálculo do Valor Nominal (VN) na compra
VN = PU_inicial * (1 + tx_compra) ** anos_total

# Parâmetros de simulação (listas usadas para gerar combinações)
anos_segurar = [1, 3, 5]
taxas_mercado = [0.0685, 0.068,0.065, 0.06, 0.055, 0.05]
cotas = 140,33

def gerar_dataframe():
    resultados = []
    for anos in anos_segurar:
        anos_restantes = anos_total - anos
        for tx in taxas_mercado:
            PU = VN / ((1 + tx) ** anos_restantes)
            resgate_total = PU * cotas
            rentab_total = (PU / PU_inicial) - 1
            rentab_anual = (PU / PU_inicial) ** (1 / anos) - 1
            resultados.append({
                "Anos Segurados": anos,
                "Taxa de Mercado": f"{tx*100:.2f}%",
                "PU no Resgate (R$)": round(PU, 2),
                "Resgate Total (R$)": round(resgate_total, 2),
                "Rentabilidade Total (%)": round(rentab_total*100, 2),
                "Rentabilidade Anual (%)": round(rentab_anual*100, 2)
            })
    return pd.DataFrame(resultados)

def export_para_excel(path="simulacao.xlsx"):
    """
    Gera um arquivo Excel com:
    - Planilha 'Parametros' contendo as variáveis editáveis (PU_inicial, tx_compra, anos_total, cotas)
      e VN calculado por fórmula.
    - Planilha 'Resultados' contendo as combinações (anos x taxas) com fórmulas (PU, Resgate, Rentabilidades).
    As fórmulas ficam no arquivo Excel, permitindo alterar parâmetros diretamente no .xlsx.
    """
    workbook = xlsxwriter.Workbook(path)
    # formatos
    money_fmt = workbook.add_format({'num_format':'#,##0.00'})
    percent_fmt = workbook.add_format({'num_format':'0.00%'})
    header_fmt = workbook.add_format({'bold': True})

    # --- Parametros sheet ---
    ws_p = workbook.add_worksheet('Parametros')
    ws_p.set_column('A:A', 20)
    ws_p.set_column('B:B', 18, money_fmt)

    ws_p.write('A1', 'PU_inicial', header_fmt)
    ws_p.write_number('B1', PU_inicial)
    ws_p.write('A2', 'tx_compra (decimal)', header_fmt)
    ws_p.write_number('B2', tx_compra)
    ws_p.write('A3', 'anos_total', header_fmt)
    ws_p.write_number('B3', anos_total)
    ws_p.write('A4', 'cotas', header_fmt)
    ws_p.write_number('B4', cotas)
    # VN calculado por fórmula no Excel para ficar dinâmico
    ws_p.write('A5', 'VN (valor nominal)', header_fmt)
    ws_p.write_formula('B5', '=B1*(1+B2)^B3', money_fmt)

    # opcional: escrever listas de entrada para referência
    ws_p.write('D1','Anos (exemplo)', header_fmt)
    for i, a in enumerate(anos_segurar, start=2):
        ws_p.write_number(f'D{i}', a)
    ws_p.write('E1','Taxas (exemplo)', header_fmt)
    for j, t in enumerate(taxas_mercado, start=2):
        ws_p.write_number(f'E{j}', t, percent_fmt)

    # --- Resultados sheet ---
    ws = workbook.add_worksheet('Resultados')
    headers = ['Anos Segurados', 'Taxa de Mercado', 'PU no Resgate (R$)', 'Resgate Total (R$)', 'Rentabilidade Total (%)', 'Rentabilidade Anual (%)']
    for col, h in enumerate(headers):
        ws.write(0, col, h, header_fmt)

    row = 1
    for anos in anos_segurar:
        for tx in taxas_mercado:
            # escreve os inputs (valores) — anos e tx na mesma linha
            ws.write_number(row, 0, anos)
            ws.write_number(row, 1, tx)

            # referências de célula para construir fórmulas
            cell_anos = xl_rowcol_to_cell(row, 0)   # ex: A2
            cell_tx = xl_rowcol_to_cell(row, 1)     # ex: B2
            cell_pu = xl_rowcol_to_cell(row, 2)     # ex: C2

            # PU no Resgate: =Parametros!$B$5 / ((1 + Taxa) ^ (Parametros!$B$3 - Anos))
            pu_formula = f"=Parametros!$B$5/((1+{cell_tx})^(Parametros!$B$3-{cell_anos}))"
            ws.write_formula(row, 2, pu_formula, money_fmt)

            # Resgate Total: = PU * Parametros!$B$4
            resgate_formula = f"={cell_pu}*Parametros!$B$4"
            ws.write_formula(row, 3, resgate_formula, money_fmt)

            # Rentabilidade Total (%): =(PU / Parametros!$B$1) - 1
            rentab_formula = f"=({cell_pu}/Parametros!$B$1)-1"
            ws.write_formula(row, 4, rentab_formula, percent_fmt)

            # Rentabilidade Anual (%): =POWER((PU/Parametros!$B$1), (1/Anos)) - 1
            rentab_anual_formula = f"=POWER(({cell_pu}/Parametros!$B$1),(1/{cell_anos}))-1"
            ws.write_formula(row, 5, rentab_anual_formula, percent_fmt)

            row += 1

    # ajustar larguras e formatos finais
    ws.set_column(0, 0, 15)
    ws.set_column(1, 1, 14, percent_fmt)
    ws.set_column(2, 3, 20, money_fmt)
    ws.set_column(4, 5, 20, percent_fmt)

    workbook.close()
    print(f"Arquivo Excel gerado: {path}")

if __name__ == "__main__":
    # gera DataFrame e imprime no terminal (como antes)
    df = gerar_dataframe()
    print(df.to_string(index=False))
    # exporta planilha Excel com fórmulas
    export_para_excel("c:\\Users\\eoric\\OneDrive - FEI\\Automação startuo\\simulacao.xlsx")

