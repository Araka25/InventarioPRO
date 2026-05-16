# Inventario PRO

Painel de inventário PCP com análise de divergências por planta, snapshots mensais e detecção de reincidências.

Aplicação client-side (HTML + CSS + JS puro) com persistência em Supabase e autenticação por email/senha.

## Funcionalidades principais

- **Análise PCP** — Divergências por planta (SBO / Sorocaba / Resende), separação por tolerância ±5,5%, análise por material e tipo
- **Snapshots mensais** — Salva o estado do mês para acompanhar reincidências entre meses
- **Drill-down lateral** — Clique em qualquer agregado (cliente, fornecedor, material, planta) para abrir o detalhamento dos itens
- **Dashboard por cliente / setor / custo** — Visões alternativas dos mesmos dados
- **Importação de planilha** — Suporta `.xlsx`, `.csv` e `.tsv` com mapeamento automático de colunas
- **Login multiusuário** — Cada usuário enxerga apenas seus próprios registros (RLS no Supabase)

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript ES2020 (sem build) |
| Auth + DB | [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS) |
| Hospedagem | [Vercel](https://vercel.com) (static deploy) |

## Como rodar localmente

1. Clone o repositório
2. Edite `supabase-client.js` com as credenciais do seu projeto Supabase:
   ```js
   const SUPABASE_URL = "https://SEU_PROJECT_ID.supabase.co";
   const SUPABASE_ANON_KEY = "sua_publishable_key";
   ```
3. Abra `index.html` no navegador (não precisa de servidor — é HTML estático)

## Setup do Supabase

Execute o conteúdo de [`schema.sql`](./schema.sql) no SQL Editor do seu projeto Supabase. Ele cria:
- Tabela `inventory_records` com RLS por usuário
- Tabela `inventory_snapshots` para histórico mensal por planta
- Índices e policies adequadas

Depois cadastre um usuário em **Authentication → Users → Add user** (marque "Auto Confirm User").

## Colunas reconhecidas na importação

`P.NUMBER`, `UNIDADE`, `SALDO NIGURI`, `STK SBO`, `PROCESSO`, `SOROCABA`, `RESENDE`, `INV.TOTAL`, `COMPARATIVO`, `%`, `FORNECEDOR`, `MATERIAL`, `CLIENTE`, `PREÇO UNITÁRIO`, `CUSTO DIVERGÊNCIA`.

A coluna `UNIDADE` aceita variações como `Planta`, `Filial`, `Fábrica`, etc. Valores `SBO`, `Sorocaba` e `Resende` são reconhecidos automaticamente.

## Deploy

A aplicação é 100% estática. Para publicar, basta apontar Vercel / Netlify / GitHub Pages para a raiz do repositório.

## Licença

Uso interno.
