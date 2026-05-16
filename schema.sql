-- ============================================================
-- Inventario Control — Supabase Schema
-- Execute no SQL Editor do seu projeto Supabase:
-- https://app.supabase.com → Seu projeto → SQL Editor
-- ============================================================

create table if not exists inventory_records (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,

  -- Identificação
  part_number     text        not null,
  row_number      text        default '',

  -- Quantidades
  saldo_niguri    numeric     default 0,
  stk_sbo         numeric     default 0,
  processo        numeric     default 0,
  sorocaba        numeric     default 0,
  resende         numeric     default 0,
  inv_total       numeric     default 0,

  -- Divergência
  comparativo     numeric     default 0,
  percentual      numeric     default 0,

  -- Custo
  preco_unitario  numeric     default 0,
  custo_diverg    numeric     default 0,

  -- Classificação
  fornecedor      text        default '',
  material        text        default '',
  cliente         text        default '',

  -- Status e apontamentos
  status          text        default 'OK',
  acao            text        default '',
  responsavel     text        default '',
  observacao      text        default '',
  revisado        boolean     default false,

  -- Metadados
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Índice para busca rápida por usuário
create index if not exists idx_inventory_user_id
  on inventory_records(user_id);

-- Índice para busca por part number
create index if not exists idx_inventory_part_number
  on inventory_records(user_id, part_number);

-- Row Level Security: cada usuário vê apenas seus próprios registros
alter table inventory_records enable row level security;

create policy "Usuarios gerenciam proprios registros"
  on inventory_records
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_inventory_updated_at
  before update on inventory_records
  for each row execute function update_updated_at();

-- ============================================================
-- Snapshots mensais para análise de reincidência
-- ============================================================

create table if not exists inventory_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  reference_month date        not null,  -- ex: 2026-05-01
  created_at      timestamptz default now(),

  -- Resumo agregado
  total_items         int     default 0,
  items_above         int     default 0,    -- >+5%
  items_below         int     default 0,    -- <-5%
  items_in_tolerance  int     default 0,    -- -5% a +5%
  cost_above          numeric default 0,
  cost_below          numeric default 0,
  cost_total_abs      numeric default 0,

  -- Detalhes para reincidência (snapshot dos itens divergentes)
  divergent_items     jsonb   default '[]',

  unique(user_id, reference_month)
);

create index if not exists idx_snapshots_user_month
  on inventory_snapshots(user_id, reference_month desc);

alter table inventory_snapshots enable row level security;

create policy "Usuarios gerenciam proprios snapshots"
  on inventory_snapshots
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- v2 — Suporte a múltiplas plantas (SBO, Sorocaba, Resende)
-- Execute mesmo que já tenha criado as tabelas anteriores
-- ============================================================

alter table inventory_records
  add column if not exists unidade text default '';

create index if not exists idx_inventory_unidade
  on inventory_records(user_id, unidade);

alter table inventory_snapshots
  add column if not exists unidade text default 'TODAS';

-- Recria a constraint única para incluir unidade
alter table inventory_snapshots
  drop constraint if exists inventory_snapshots_user_id_reference_month_key;

alter table inventory_snapshots
  drop constraint if exists inventory_snapshots_unique_month_unit;

alter table inventory_snapshots
  add constraint inventory_snapshots_unique_month_unit
  unique (user_id, reference_month, unidade);
