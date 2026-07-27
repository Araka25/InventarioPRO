const STORAGE_KEY = "inventario-control-state-v1";
const seed = window.INVENTORY_SEED || { records: [], summary: {} };
const app = document.querySelector("#app");
const toastEl = document.querySelector("#toast");

const fmtInt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const fmtNum = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const importFields = [
  { key: "partNumber", label: "P. NUMBER", required: true, aliases: ["p number", "p. number", "p.number", "pnumber", "part number", "partnumber", "pn", "p/n"] },
  { key: "saldoNiguri", label: "SALDO NIGURI", type: "number", aliases: ["saldo niguri", "saldoniguri"] },
  { key: "stkSbo", label: "STK SBO", type: "number", aliases: ["stk sbo", "stksbo", "estoque sbo"] },
  { key: "processo", label: "PROCESSO", type: "number", aliases: ["processo", "proc"] },
  { key: "sorocaba", label: "SOROCABA", type: "number", aliases: ["sorocaba", "sor"] },
  { key: "resende", label: "RESENDE", type: "number", aliases: ["resende", "res"] },
  { key: "invTotal", label: "INV.TOTAL", type: "number", aliases: ["inv total", "inv.total", "inventario total", "inventário total", "total"] },
  { key: "comparativo", label: "COMPARATIVO", type: "number", aliases: ["comparativo", "comparacao", "comparação", "diferença", "diferenca"] },
  { key: "percentual", label: "%", type: "number", aliases: ["%", "percentual", "porcentagem"] },
  { key: "fornecedor", label: "FORNECEDOR", aliases: ["fornecedor", "supplier"] },
  { key: "material", label: "MATERIAL", aliases: ["material", "descricao", "descrição", "description"] },
  { key: "cliente", label: "CLIENTE", aliases: ["cliente", "client", "customer"] },
  { key: "unidade", label: "UNIDADE", aliases: ["unidade", "planta", "plant", "unit", "filial", "fabrica", "fábrica", "site", "local"] },
  { key: "precoUnitario", label: "PREÇO UNITÁRIO", type: "number", aliases: ["preco unitario", "preço unitário", "preco un", "preço un", "preco", "preço", "unitario", "unitário"] },
  { key: "custoDivergencia", label: "CUSTO DIVERGÊNCIA", type: "number", aliases: ["custo divergencia", "custo divergência", "custo diver", "valor divergencia", "valor divergência"] },
  { key: "mesReferencia", label: "MÊS REFERÊNCIA", aliases: ["mes", "mês", "mes referencia", "mes ref", "mes de referencia", "data", "data inventario", "data do inventario", "periodo", "período", "competencia", "competência", "referencia", "referência", "month"] },
];

const PLANTS = ["TODAS", "SBO", "SOROCABA", "RESENDE"];

function normalizePlant(value) {
  if (value === undefined || value === null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  // Remove acentos, lowercase, e tira espaços/pontuação para comparação robusta
  const t = normalize(raw).replace(/[\s\.\-_\/\\]+/g, "");
  if (t.includes("sbo") || t.includes("saobernardo")) return "SBO";
  if (t.includes("sorocaba")) return "SOROCABA";
  if (t.includes("resende")) return "RESENDE";
  return raw.toUpperCase();
}

const ICONS = {
  analise: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2z"/><path d="M19 3h-4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/><path d="M14 9l4 4"/></svg>`,
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16V9"/><path d="M12 16v-5"/><path d="M17 16v-3"/></svg>`,
  custos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  divergencias: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>`,
  partnumber: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>`,
  apontamentos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  inventario: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
};

const views = [
  { key: "analise", label: "Análise PCP", icon: ICONS.analise },
  { key: "dashboard", label: "Índice por cliente", icon: ICONS.dashboard },
  { key: "custos", label: "Gráfico de custo", icon: ICONS.custos },
  { key: "divergencias", label: "Soma e divergências", icon: ICONS.divergencias },
  { key: "partnumber", label: "Por part number", icon: ICONS.partnumber },
  { key: "apontamentos", label: "Lançar apontamentos", icon: ICONS.apontamentos },
  { key: "inventario", label: "Lista de informações", icon: ICONS.inventario },
];

let state = {
  view: "analise",
  records: [],
  snapshots: [],
  loading: true,
  user: null,
  analiseTop: 10,
  analiseTab: "financeiro",
  analisePlanta: "TODAS",
  drawer: null,  // { field, value, scope? }
  filters: {
    query: "",
    status: "all",
    movimento: "all",
    fornecedor: "all",
    material: "all",
    cliente: "all",
  },
  sortBy: "risk",
  sortDir: "desc",
  periodo: "atual",   // "atual" | "todos" (quando nenhum mês está selecionado)
  periodoMeses: [],   // meses selecionados ["YYYY-MM-01", ...] — vazio = usa periodo
  periodoAno: new Date().getFullYear(),  // ano corrente do seletor de mês
  monthlyFilter: "",         // busca na tabela de divergências mensais
  monthlySort: "absCost",    // absCost | totalQty | totalCost | partNumber | material
  monthlySortDir: "desc",    // desc = maior→menor / Z→A ; asc = menor→maior / A→Z
  topN: 5,
  page: 1,
  pageSize: 50,
  modal: null,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Converte linha do Supabase (snake_case) para o formato do app (camelCase)
function rowToRecord(row) {
  return {
    id: row.id,
    rowNumber: row.row_number || "",
    partNumber: row.part_number,
    saldoNiguri: row.saldo_niguri || 0,
    stkSbo: row.stk_sbo || 0,
    processo: row.processo || 0,
    sorocaba: row.sorocaba || 0,
    resende: row.resende || 0,
    invTotal: row.inv_total || 0,
    comparativo: row.comparativo || 0,
    percentual: row.percentual || 0,
    precoUnitario: row.preco_unitario || 0,
    custoDivergencia: row.custo_diverg || 0,
    fornecedor: row.fornecedor || "",
    material: row.material || "",
    cliente: row.cliente || "",
    unidade: row.unidade || "",
    status: cleanStatus(row.status),
    acao: row.acao || "",
    responsavel: row.responsavel || "",
    observacao: row.observacao || "",
    revisado: row.revisado || false,
    attentionTags: [],
  };
}

// Converte registro do app (camelCase) para linha do Supabase (snake_case)
function recordToRow(record) {
  return {
    id: record.id,
    user_id: state.user.id,
    part_number: record.partNumber,
    row_number: String(record.rowNumber || ""),
    saldo_niguri: record.saldoNiguri || 0,
    stk_sbo: record.stkSbo || 0,
    processo: record.processo || 0,
    sorocaba: record.sorocaba || 0,
    resende: record.resende || 0,
    inv_total: record.invTotal || 0,
    comparativo: record.comparativo || 0,
    percentual: record.percentual || 0,
    preco_unitario: record.precoUnitario || 0,
    custo_diverg: record.custoDivergencia || 0,
    fornecedor: record.fornecedor || "",
    material: record.material || "",
    cliente: record.cliente || "",
    unidade: record.unidade || "",
    status: record.status || "OK",
    acao: record.acao || "",
    responsavel: record.responsavel || "",
    observacao: record.observacao || "",
    revisado: record.revisado || false,
  };
}

async function loadFromSupabase() {
  const { data, error } = await db
    .from("inventory_records")
    .select("*")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return prepareRecords(data.map(rowToRecord));
}

function prepareRecords(records) {
  return records.map((record) => ({
    ...record,
    status: cleanStatus(record.status),
  }));
}

function cleanStatus(status) {
  const text = String(status || "OK");
  const key = normalize(text);
  if (key.includes("urgente")) return "Urgente";
  if (key.startsWith("cr") || text.includes("Cr?")) return "Crítico";
  if (key.startsWith("aten") || text.includes("Aten")) return "Atenção";
  return "OK";
}

function sourceLabel() {
  const label = seed.sourceFile || "DADOS INVENTÁRIO.xlsx";
  return label.includes("?") ? "DADOS INVENTÁRIO.xlsx" : label;
}

async function persistUpsert(record) {
  const { error } = await db
    .from("inventory_records")
    .upsert(recordToRow(record), { onConflict: "id" });
  if (error) {
    console.error("Supabase upsert:", error);
    showToast("Erro ao salvar no servidor", "error");
  }
}

async function persistDelete(id) {
  const { error } = await db
    .from("inventory_records")
    .delete()
    .eq("id", id)
    .eq("user_id", state.user.id);
  if (error) {
    console.error("Supabase delete:", error);
    showToast("Erro ao excluir no servidor", "error");
  }
}

async function persistBatch(records) {
  const { error: delErr } = await db
    .from("inventory_records")
    .delete()
    .eq("user_id", state.user.id);
  if (delErr) throw delErr;
  if (!records.length) return;
  const rows = records.map(recordToRow);
  const CHUNK_SIZE = 500;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await db.from("inventory_records").insert(chunk);
    if (error) throw error;
  }
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function displayInt(value) {
  return fmtInt.format(number(value));
}

function displayQty(value) {
  return fmtNum.format(number(value));
}

function displayMoney(value) {
  return fmtMoney.format(number(value));
}

function displayPct(value) {
  return `${(number(value) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function statusClass(status) {
  const key = normalize(status);
  if (key.includes("urgente")) return "urgente";
  if (key.includes("critico")) return "critico";
  if (key.includes("atencao")) return "atencao";
  return "ok";
}

function statusBadge(status) {
  return `<span class="badge ${statusClass(status)}">${escapeHtml(status || "OK")}</span>`;
}

function movement(record) {
  const comp = number(record.comparativo);
  if (comp > 0) return "Sobra";
  if (comp < 0) return "Falta";
  return "OK";
}

function riskScore(record) {
  const statusWeight = { OK: 0, "Atenção": 120, "Crítico": 260, Urgente: 460 };
  return (statusWeight[record.status] || 0)
    + Math.abs(number(record.custoDivergencia)) / 18
    + Math.abs(number(record.comparativo)) / 6
    + Math.abs(number(record.percentual)) * 900;
}

function autoStatus(record) {
  const absQty = Math.abs(number(record.comparativo));
  const absCost = Math.abs(number(record.custoDivergencia));
  const absPct = Math.abs(number(record.percentual));
  if (absQty === 0 && absCost === 0) return "OK";
  if (absCost >= 5000 || absQty >= 1000 || absPct >= 0.1) return "Urgente";
  if (absCost >= 2000 || absQty >= 300 || absPct >= 0.05) return "Crítico";
  return "Atenção";
}

function makeTags(record) {
  const tags = [];
  const comp = number(record.comparativo);
  const absCost = Math.abs(number(record.custoDivergencia));
  const absPct = Math.abs(number(record.percentual));
  if (comp < 0) tags.push("Falta");
  if (comp > 0) tags.push("Sobra");
  if (absCost >= 5000) tags.push("Alto custo");
  if (absPct >= 0.1) tags.push("% alto");
  if (number(record.saldoNiguri) === 0 && number(record.invTotal) > 0) tags.push("Saldo zero com estoque");
  if (normalize(record.fornecedor) === "fora de linha") tags.push("Fora de linha");
  return tags;
}

function calcFields(record) {
  const invTotal = number(record.stkSbo) + number(record.processo) + number(record.sorocaba) + number(record.resende);
  const comparativo = invTotal - number(record.saldoNiguri);
  const percentual = number(record.saldoNiguri) ? comparativo / number(record.saldoNiguri) : 0;
  const custoDivergencia = comparativo * number(record.precoUnitario);
  return {
    ...record,
    invTotal,
    comparativo,
    percentual,
    custoDivergencia,
  };
}

function stats(records = state.records) {
  const divergent = records.filter((r) => number(r.comparativo) !== 0);
  const falta = records.filter((r) => number(r.comparativo) < 0);
  const sobra = records.filter((r) => number(r.comparativo) > 0);
  const reviewed = records.filter((r) => r.revisado);
  const urgent = records.filter((r) => r.status === "Urgente");
  const critical = records.filter((r) => r.status === "Crítico");
  const notes = records.filter((r) => r.observacao || r.acao || r.responsavel);
  return {
    total: records.length,
    divergent: divergent.length,
    ok: records.length - divergent.length,
    falta: falta.length,
    sobra: sobra.length,
    reviewed: reviewed.length,
    urgent: urgent.length,
    critical: critical.length,
    notes: notes.length,
    qtyAbs: records.reduce((sum, r) => sum + Math.abs(number(r.comparativo)), 0),
    costAbs: records.reduce((sum, r) => sum + Math.abs(number(r.custoDivergencia)), 0),
    costSaldo: records.reduce((sum, r) => sum + number(r.custoDivergencia), 0),
    locations: {
      "STK SBO": records.reduce((sum, r) => sum + number(r.stkSbo), 0),
      PROCESSO: records.reduce((sum, r) => sum + number(r.processo), 0),
      SOROCABA: records.reduce((sum, r) => sum + number(r.sorocaba), 0),
      RESENDE: records.reduce((sum, r) => sum + number(r.resende), 0),
    },
  };
}

function groupTop(records, field, metric = "custoDivergencia", limit = 8) {
  const map = new Map();
  records.forEach((record) => {
    const label = record[field] || "Sem cadastro";
    const current = map.get(label) || { label, items: 0, qty: 0, cost: 0 };
    current.items += 1;
    current.qty += Math.abs(number(record.comparativo));
    current.cost += Math.abs(number(record[metric]));
    map.set(label, current);
  });
  return [...map.values()].sort((a, b) => b.cost - a.cost).slice(0, limit);
}

function activeRows() {
  return filteredRecords(periodRecords());
}

function topLimit() {
  return Math.max(3, Math.min(20, number(state.topN) || 5));
}

function topPartNumbers(records, limit = topLimit()) {
  return [...records]
    .filter((record) => Math.abs(number(record.custoDivergencia)) > 0 || Math.abs(number(record.comparativo)) > 0)
    .sort((a, b) => Math.abs(number(b.custoDivergencia)) - Math.abs(number(a.custoDivergencia)))
    .slice(0, limit);
}

function groupMovement(records) {
  const groups = {
    Falta: { label: "Falta", items: 0, qty: 0, cost: 0 },
    Sobra: { label: "Sobra", items: 0, qty: 0, cost: 0 },
    OK: { label: "OK", items: 0, qty: 0, cost: 0 },
  };
  records.forEach((record) => {
    const key = movement(record);
    groups[key].items += 1;
    groups[key].qty += Math.abs(number(record.comparativo));
    groups[key].cost += Math.abs(number(record.custoDivergencia));
  });
  return Object.values(groups);
}

function statusSegments(records) {
  const s = stats(records);
  return [
    ["OK", s.ok, "var(--green)"],
    ["Atenção", records.filter((r) => r.status === "Atenção").length, "var(--yellow)"],
    ["Crítico", s.critical, "var(--orange)"],
    ["Urgente", s.urgent, "var(--red)"],
  ];
}

function unique(field) {
  return [...new Set(state.records.map((r) => r[field]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
}

function filteredRecords(base = state.records) {
  const f = state.filters;
  const query = normalize(f.query);
  let rows = base.filter((record) => {
    const haystack = normalize([
      record.partNumber,
      record.fornecedor,
      record.material,
      record.cliente,
      record.status,
      ...(record.attentionTags || []),
      record.observacao,
      record.acao,
      record.responsavel,
    ].join(" "));
    const matchQuery = !query || haystack.includes(query);
    const matchStatus = f.status === "all" || record.status === f.status;
    const matchMov = f.movimento === "all" || movement(record) === f.movimento;
    const matchFornecedor = f.fornecedor === "all" || record.fornecedor === f.fornecedor;
    const matchMaterial = f.material === "all" || record.material === f.material;
    const matchCliente = f.cliente === "all" || record.cliente === f.cliente;
    return matchQuery && matchStatus && matchMov && matchFornecedor && matchMaterial && matchCliente;
  });

  rows = rows.sort((a, b) => {
    const dir = state.sortDir === "asc" ? 1 : -1;
    const sorters = {
      risk: () => riskScore(a) - riskScore(b),
      partNumber: () => String(a.partNumber).localeCompare(String(b.partNumber), "pt-BR"),
      comparativo: () => Math.abs(number(a.comparativo)) - Math.abs(number(b.comparativo)),
      percentual: () => Math.abs(number(a.percentual)) - Math.abs(number(b.percentual)),
      custoDivergencia: () => Math.abs(number(a.custoDivergencia)) - Math.abs(number(b.custoDivergencia)),
      fornecedor: () => String(a.fornecedor).localeCompare(String(b.fornecedor), "pt-BR"),
      material: () => String(a.material).localeCompare(String(b.material), "pt-BR"),
      status: () => String(a.status).localeCompare(String(b.status), "pt-BR"),
    };
    return (sorters[state.sortBy] ? sorters[state.sortBy]() : sorters.risk()) * dir;
  });

  return rows;
}

function showToast(message, type = "success") {
  toastEl.textContent = message;
  toastEl.className = `toast show ${type === "error" ? "error" : ""}`;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toastEl.className = "toast";
  }, 2600);
}

function setView(view) {
  state.view = view;
  state.page = 1;
  render();
}

function setFilter(key, value) {
  state.filters[key] = value;
  state.page = 1;
  render();
  if (key === "query") {
    window.requestAnimationFrame(() => {
      const input = document.querySelector("#queryFilter");
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }
}

function clearFilters() {
  state.filters = { query: "", status: "all", movimento: "all", fornecedor: "all", material: "all", cliente: "all" };
  state.page = 1;
  render();
}

function render() {
  if (state.loading) {
    app.innerHTML = `
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <p>Carregando inventário...</p>
      </div>
    `;
    return;
  }
  app.innerHTML = `
    <div class="app">
      <main class="content">
        ${renderTopbar()}
        ${renderCurrentView()}
      </main>
    </div>
    ${state.modal ? renderModal() : ""}
    ${state.drawer ? renderDrawer() : ""}
  `;
  bindEvents();
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="title-block">
        <h1>${viewTitle()}</h1>
        <p>Base: ${escapeHtml(sourceLabel())} · ${displayInt(state.records.length)} itens carregados · leitura de PCP por custo, quantidade e atenção.</p>
      </div>
      <div class="actions">
        <span class="user-email">${escapeHtml(state.user?.email || "")}</span>
        <button class="btn secondary" id="logoutButton" type="button">Sair</button>
        <button class="btn secondary" id="resetSeedButton" type="button">Restaurar base</button>
        <button class="btn secondary" id="importSheetButton" type="button">Importar planilha</button>
        <button class="btn secondary" id="exportCsvButton" type="button">Exportar CSV</button>
        <button class="btn secondary" id="exportJsonButton" type="button">Exportar JSON</button>
        <button class="btn primary" id="newItemButton" type="button">+ Novo item</button>
      </div>
    </header>
    ${renderModuleTabs()}
  `;
}

function renderModuleTabs() {
  return `
    <nav class="module-tabs" aria-label="Módulos do painel">
      ${views.map((item) => `
        <button class="module-tab ${state.view === item.key ? "active" : ""}" data-view="${item.key}" type="button">
          <span class="module-tab-icon">${item.icon}</span>
          <strong>${item.label}</strong>
        </button>
      `).join("")}
    </nav>
  `;
}

function viewTitle() {
  return {
    analise: "Análise PCP — Divergências e reincidências",
    dashboard: "Dashboard de inventário PCP",
    inventario: "Lista de informações",
    divergencias: "Soma e divergências",
    custos: "Gráfico de custo",
    partnumber: "Refugo por part number",
    apontamentos: "Lançar apontamentos",
  }[state.view] || "Inventário";
}

function renderCurrentView() {
  if (state.view === "analise") return renderAnalise();
  if (state.view === "inventario") return renderInventory();
  if (state.view === "divergencias") return renderDivergences();
  if (state.view === "custos") return renderCostView();
  if (state.view === "partnumber") return renderPartNumberView();
  if (state.view === "apontamentos") return renderNotes();
  return renderDashboard();
}

function renderKpis(records = state.records) {
  const s = stats(records);
  const cards = [
    ["Itens", s.total, "Base mapeada", "var(--accent)"],
    ["Com divergência", s.divergent, `${s.falta} faltas · ${s.sobra} sobras`, "var(--yellow)"],
    ["Custo divergente", displayMoney(s.costAbs), `Saldo: ${displayMoney(s.costSaldo)}`, "var(--red)"],
    ["Qtd. divergente", displayInt(s.qtyAbs), "Diferença absoluta", "var(--cyan)"],
    ["Urgentes", s.urgent, `${s.critical} críticos`, "var(--orange)"],
    ["Revisados", s.reviewed, `${s.notes} apontamentos`, "var(--green)"],
  ];
  return `
    <section class="grid-kpis">
      ${cards.map(([label, value, sub, color]) => `
        <article class="kpi" style="color:${color}">
          <label>${label}</label>
          <strong>${value}</strong>
          <span>${sub}</span>
        </article>
      `).join("")}
    </section>
  `;
}

function renderPcpFilters(records) {
  const clientRows = groupTop(periodRecords(), "cliente", "custoDivergencia", 16);
  const activeClient = state.filters.cliente;
  return `
    <section class="pcp-filters">
      <article class="filter-card periodo-card">
        <label>Período analisado</label>
        ${renderPeriodoSelector("completo")}
        <small>${escapeHtml(periodoDescription())}</small>
      </article>
      <article class="filter-card wide">
        <label>Busca operacional</label>
        <input id="queryFilter" value="${escapeHtml(state.filters.query)}" placeholder="Part number, fornecedor, material, cliente..." />
        <small>${displayInt(records.length)} item(ns) na leitura atual</small>
      </article>
      <article class="filter-card">
        <label>Top</label>
        <select id="topFilter">
          ${[5, 10, 15, 20].map((value) => `<option value="${value}" ${topLimit() === value ? "selected" : ""}>Top ${value}</option>`).join("")}
        </select>
        <small>Ranking dos gráficos</small>
      </article>
      <article class="filter-card">
        <label>Clientes</label>
        <div class="quick-actions">
          <button class="btn secondary small" id="clientQuickAll" type="button">Todos</button>
          <button class="btn secondary small" id="clientQuickClear" type="button">Limpar</button>
        </div>
        <small>${activeClient === "all" ? "Todos selecionados" : activeClient}</small>
      </article>
    </section>
    <section class="client-strip">
      <div class="strip-title">Por cliente</div>
      <div class="chip-row">
        ${clientRows.map((client) => `
          <button class="chip ${activeClient === client.label ? "active" : ""}" data-client-chip="${escapeHtml(client.label)}" type="button">
            ${escapeHtml(client.label)}
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderDashboard() {
  const rows = activeRows();
  return `
    ${renderPcpFilters(rows)}
    ${renderKpis(rows)}
    <section class="chart-stack">
      ${renderPartNumberBars("Divergência por part number — maior impacto financeiro", topPartNumbers(rows), "Cor da barra indica sobra (ciano) ou falta (vermelho); % no topo mostra a representação proporcional ao saldo esperado.")}
      <div class="chart-grid">
        ${renderRankingChart("Custo por cliente", groupTop(rows, "cliente", "custoDivergencia", topLimit()), "Clientes que concentram custo de divergência.", "cliente")}
        ${renderAttentionDonut(rows)}
      </div>
      <div class="chart-grid thirds">
        ${renderRankingChart("Valores por material", groupTop(rows, "material", "custoDivergencia", topLimit()), "Famílias de material por custo absoluto.", "material")}
        ${renderMovementChart(rows)}
        ${renderLocationChart(rows)}
      </div>
    </section>
  `;
}

// ============================================================
// Análise PCP — divergências, materiais e reincidências
// ============================================================

const TOLERANCE = 0.055;  // ±5.5%
const TOLERANCE_LABEL = "5,5%";

function classify(record) {
  const pct = number(record.percentual);
  if (pct > TOLERANCE) return "above";       // sobra > +5.5%
  if (pct < -TOLERANCE) return "below";       // falta < -5.5%
  if (pct !== 0) return "tolerance";          // entre -5.5% e +5.5% (com divergência)
  const comp = number(record.comparativo);
  if (comp === 0) return "ok";                // sem divergência
  // Divergência com % zerado: saldo 0 (divisão indefinida) ou % não importado.
  // Saldo 0 → qualquer contagem é desvio total, fora da tolerância; senão,
  // trata como tolerada para não sumir dos snapshots e do comparativo mensal.
  return number(record.saldoNiguri) === 0 ? (comp > 0 ? "above" : "below") : "tolerance";
}

// Mapa: nome da planta → chave do campo de estoque nesta planta
const PLANT_STOCK_FIELD = {
  SBO: "stkSbo",
  SOROCABA: "sorocaba",
  RESENDE: "resende",
};

// Recalcula o registro usando APENAS o estoque da planta selecionada
function recalcForPlant(record, planta) {
  const field = PLANT_STOCK_FIELD[planta];
  if (!field) return record;
  const plantStock = number(record[field]);
  const saldo = number(record.saldoNiguri);
  const comparativo = plantStock - saldo;
  const percentual = saldo ? comparativo / saldo : 0;
  const custoDivergencia = comparativo * number(record.precoUnitario);
  return {
    ...record,
    invTotal: plantStock,
    comparativo,
    percentual,
    custoDivergencia,
  };
}

function filterByPlant(records, planta = state.analisePlanta) {
  if (!planta || planta === "TODAS") return records;

  // Se a coluna UNIDADE estiver populada para essa planta, usa o filtro direto
  const taggedRecords = records.filter((r) => normalizePlant(r.unidade) === planta);
  if (taggedRecords.length > 0) return taggedRecords;

  // Fallback: usa a coluna de estoque correspondente à planta e recalcula a divergência
  if (PLANT_STOCK_FIELD[planta]) {
    return records
      .filter((r) => number(r[PLANT_STOCK_FIELD[planta]]) !== 0 || number(r.saldoNiguri) !== 0)
      .map((r) => recalcForPlant(r, planta));
  }

  return [];
}

function uniquePlants() {
  const set = new Set();
  state.records.forEach((r) => {
    const p = normalizePlant(r.unidade);
    if (p) set.add(p);
  });
  return [...set].sort();
}

function analiseSummary(records) {
  const summary = {
    // Por faixa de tolerância: cost = soma absoluta, net = soma com sinais, qty = peças (com sinal)
    above: { items: [], cost: 0, net: 0, qty: 0 },       // sobra > +5.5%
    below: { items: [], cost: 0, net: 0, qty: 0 },       // falta < -5.5%
    tolerance: { items: [], cost: 0, net: 0, qty: 0 },   // dentro ±5.5% (com divergência)
    ok: { items: [], cost: 0, net: 0, qty: 0 },          // sem divergência
    // Todos os divergentes: cost = bruto (absoluto), costNet = líquido (com sinais)
    allDivergent: { items: [], cost: 0, costNet: 0 },
    // Quebra por SINAL (todos os itens com divergência, qualquer %)
    sobra: { count: 0, cost: 0, qty: 0 },  // comparativo > 0 → custo positivo (excesso)
    falta: { count: 0, cost: 0, qty: 0 },  // comparativo < 0 → custo negativo (perda)
    totalAnalyzed: records.length,
  };
  records.forEach((r) => {
    const cls = classify(r);
    const signedCost = number(r.custoDivergencia);
    const absCost = Math.abs(signedCost);
    const comp = number(r.comparativo);

    summary[cls].items.push(r);
    summary[cls].cost += absCost;
    summary[cls].net += signedCost;
    summary[cls].qty += comp;

    if (comp !== 0) {
      summary.allDivergent.items.push(r);
      summary.allDivergent.cost += absCost;
      summary.allDivergent.costNet += signedCost;
    }

    // Quebra por sinal — independente da faixa de tolerância
    if (comp > 0) { summary.sobra.count += 1; summary.sobra.cost += signedCost; summary.sobra.qty += comp; }
    if (comp < 0) { summary.falta.count += 1; summary.falta.cost += signedCost; summary.falta.qty += comp; }
  });
  return summary;
}

// allowStockFallback: só na base ao vivo, que tem as colunas de estoque.
// Em snapshots (período histórico) essas colunas são 0, então cai no Modo 1.
function analiseByPlanta(records, allowStockFallback = true) {
  // Detecta se temos coluna UNIDADE populada em algum registro
  const hasUnidade = records.some((r) => normalizePlant(r.unidade));

  // Modo 1: UNIDADE populada (ou sem fallback de estoque) → agrupa pela coluna
  if (hasUnidade || !allowStockFallback) {
    const map = new Map();
    records.forEach((r) => {
      const key = normalizePlant(r.unidade) || "SEM CADASTRO";
      accumulatePlant(map, key, r);
    });
    return [...map.values()].sort((a, b) => (b.costAbove + b.costBelow) - (a.costAbove + a.costBelow));
  }

  // Modo 2: UNIDADE vazia → usa as colunas de estoque por planta
  // Cada item gera 1 linha por planta onde tem estoque (recalculando divergência)
  const map = new Map();
  ["SBO", "SOROCABA", "RESENDE"].forEach((planta) => {
    records.forEach((r) => {
      const plantStock = number(r[PLANT_STOCK_FIELD[planta]]);
      if (plantStock === 0 && number(r.saldoNiguri) === 0) return;
      const recalc = recalcForPlant(r, planta);
      accumulatePlant(map, planta, recalc);
    });
  });
  return [...map.values()].sort((a, b) => (b.costAbove + b.costBelow) - (a.costAbove + a.costBelow));
}

function accumulatePlant(map, key, r) {
  const cur = map.get(key) || {
    label: key,
    total: 0,
    above: 0, below: 0, tolerance: 0, ok: 0,
    sobraAll: 0, faltaAll: 0,
    costAbove: 0, costBelow: 0, costTotal: 0, costNet: 0,
  };
  cur.total += 1;
  const cls = classify(r);
  cur[cls] += 1;
  const comp = number(r.comparativo);
  if (comp > 0) cur.sobraAll += 1;
  if (comp < 0) cur.faltaAll += 1;
  const signedCost = number(r.custoDivergencia);
  const absCost = Math.abs(signedCost);
  if (cls === "above") cur.costAbove += absCost;
  if (cls === "below") cur.costBelow += absCost;
  if (comp !== 0) {
    cur.costTotal += absCost;
    cur.costNet += signedCost;
  }
  map.set(key, cur);
}

function renderPlantAnalysis(byPlanta) {
  if (!byPlanta.length) {
    return `<div class="empty-state">Sem itens para analisar. Importe a planilha com a coluna UNIDADE preenchida (SBO, Sorocaba ou Resende).</div>`;
  }
  return `
    <div class="plant-grid">
      ${byPlanta.map((p) => {
        const totalDiv = p.above + p.below + p.tolerance;
        const pctFora = p.total ? ((p.above + p.below) / p.total * 100) : 0;
        return `
          <article class="plant-card drill-target" data-plant="${escapeHtml(p.label)}" data-drill="unidade:${escapeHtml(p.label)}">
            <header>
              <div>
                <span class="plant-name">${escapeHtml(p.label)}</span>
                <small>${displayInt(p.total)} itens · ${displayInt(totalDiv)} com divergência</small>
              </div>
              <button class="btn ghost small" data-analise-planta="${escapeHtml(p.label)}" data-drill-skip type="button">Filtrar</button>
            </header>
            <div class="plant-stats">
              <div class="plant-stat above">
                <label>SOBRA > +${TOLERANCE_LABEL}</label>
                <strong>${displayInt(p.above)}</strong>
                <span>${displayMoney(p.costAbove)}</span>
              </div>
              <div class="plant-stat below">
                <label>FALTA < −${TOLERANCE_LABEL}</label>
                <strong>${displayInt(p.below)}</strong>
                <span>${displayMoney(p.costBelow)}</span>
              </div>
              <div class="plant-stat tolerance">
                <label>DENTRO ±${TOLERANCE_LABEL}</label>
                <strong>${displayInt(p.tolerance)}</strong>
                <span>${pctFora.toFixed(1)}% fora</span>
              </div>
              <div class="plant-stat total">
                <label>NET DIVERG. (sobra − falta)</label>
                <strong class="${number(p.costNet) < 0 ? "net-falta-text" : number(p.costNet) > 0 ? "net-sobra-text" : ""}">
                  ${number(p.costNet) < 0 ? "↓ " : number(p.costNet) > 0 ? "↑ " : ""}${displayMoney(Math.abs(number(p.costNet)))}
                </strong>
                <span>bruto ${displayMoney(p.costTotal)} · ${displayInt(p.sobraAll)} sobra · ${displayInt(p.faltaAll)} falta</span>
              </div>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function analiseByMaterial(records) {
  const map = new Map();
  records.forEach((r) => {
    const key = (r.material || "Sem cadastro").trim() || "Sem cadastro";
    const cur = map.get(key) || {
      label: key,
      total: 0,
      above: 0, below: 0, tolerance: 0, ok: 0,
      sobraAll: 0, faltaAll: 0,
      costAbove: 0, costBelow: 0, costTotal: 0,
    };
    cur.total += 1;
    const cls = classify(r);
    cur[cls] += 1;
    const comp = number(r.comparativo);
    if (comp > 0) cur.sobraAll += 1;
    if (comp < 0) cur.faltaAll += 1;
    const absCost = Math.abs(number(r.custoDivergencia));
    if (cls === "above") cur.costAbove += absCost;
    if (cls === "below") cur.costBelow += absCost;
    if (comp !== 0) cur.costTotal += absCost;
    map.set(key, cur);
  });
  return [...map.values()].sort((a, b) => (b.costAbove + b.costBelow) - (a.costAbove + a.costBelow));
}

function topItems(items, sortBy, limit) {
  const sorted = [...items].sort((a, b) => {
    if (sortBy === "financeiro") return Math.abs(number(b.custoDivergencia)) - Math.abs(number(a.custoDivergencia));
    return Math.abs(number(b.percentual)) - Math.abs(number(a.percentual));
  });
  return limit === "all" ? sorted : sorted.slice(0, Number(limit));
}

function pctBadge(pct) {
  const value = number(pct);
  const sign = value > 0 ? "+" : "";
  const cls = value > TOLERANCE ? "above" : value < -TOLERANCE ? "below" : value !== 0 ? "tolerance" : "ok";
  return `<span class="pct-badge ${cls}">${sign}${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>`;
}

function renderAnalise() {
  const planta = state.analisePlanta;
  // Todos os números da aba respeitam o período selecionado (mês, meses ou base ao vivo)
  const base = periodRecords();
  const isLive = !(state.periodoMeses || []).length && state.periodo === "atual";
  const records = filterByPlant(base);
  const sum = analiseSummary(records);
  // Em período (TODAS), os snapshots guardam só os divergentes; usa o total_items
  // gravado na importação para "itens analisados" bater com o Atual (inclui os OK).
  if (!isLive && planta === "TODAS") {
    const totalStored = periodTotalItems();
    if (totalStored > sum.totalAnalyzed) {
      sum.okExtra = totalStored - sum.totalAnalyzed;
      sum.totalAnalyzed = totalStored;
    }
  }
  // Líquido real dos itens fora da tolerância: sobra (+) menos falta (−)
  const critLiquido = number(sum.above.net) + number(sum.below.net);
  const topMode = state.analiseTop;
  const tab = state.analiseTab;
  const byMaterial = analiseByMaterial(records);
  const byPlanta = analiseByPlanta(base, isLive);
  // Lista de snapshots: em "TODAS" mostra os de qualquer escopo (cada card
  // exibe sua planta); reincidências usam o mesmo fallback da matriz mensal.
  const plantSnapshots = planta === "TODAS"
    ? state.snapshots
    : state.snapshots.filter((s) => (s.unidade || "TODAS") === planta);
  const reincidences = computeReincidences(records, monthlySnapshotsForPlant(planta));
  const monthlyMatrix = computeMonthlyMatrix(monthlySnapshotsForPlant(planta), records, state.periodoMeses);
  const detectedPlants = uniquePlants();
  const plantLabel = planta === "TODAS" ? "Todas as plantas" : planta;
  // Aviso de UNIDADE só faz sentido na base ao vivo (snapshots não têm colunas de estoque)
  const unclassified = isLive ? state.records.filter((r) => !normalizePlant(r.unidade)).length : 0;
  const usingFallback = isLive && unclassified === state.records.length && state.records.length > 0;

  return `
    <section class="plant-bar">
      <div class="plant-bar-info">
        <span class="plant-bar-label">PLANTA</span>
        <strong>${escapeHtml(plantLabel)}</strong>
        <small>${displayInt(records.length)} itens · tolerância ±${TOLERANCE_LABEL}${usingFallback ? " · usando colunas de estoque" : ""}</small>
      </div>
      <div class="seg-control plant-control">
        ${PLANTS.map((p) => `
          <button class="seg-btn ${planta === p ? "active" : ""}" data-analise-planta="${p}" type="button">
            ${p === "TODAS" ? "Todas" : p}
          </button>
        `).join("")}
        ${detectedPlants.filter((p) => !PLANTS.includes(p)).map((p) => `
          <button class="seg-btn ${planta === p ? "active" : ""}" data-analise-planta="${escapeHtml(p)}" type="button">${escapeHtml(p)}</button>
        `).join("")}
      </div>
    </section>

    <section class="panel pad periodo-panel">
      <div class="panel-title">
        <div>
          <h3>Período analisado</h3>
          <p>Selecione o ano e o mês para analisar apenas aquele inventário. Marque vários meses para acumular, ou use "Atual" / "Todos".</p>
        </div>
        <span class="periodo-desc">${escapeHtml(periodoDescription())}</span>
      </div>
      ${renderPeriodoSelector("completo")}
      ${renderPeriodConference()}
    </section>

    ${unclassified > 0 ? `
      <section class="planta-warning">
        <div>
          <strong>⚠ ${displayInt(unclassified)} itens sem coluna UNIDADE preenchida</strong>
          <p>O cálculo por planta está usando as colunas STK SBO / SOROCABA / RESENDE como fallback. Para resultado preciso, classifique cada item com sua planta.</p>
        </div>
        <button class="btn primary" id="autoClassifyButton" type="button">⚡ Auto-classificar pelas colunas de estoque</button>
      </section>
    ` : ""}

    <section class="analise-summary">
      ${renderAnaliseCard(`SOBRA > +${TOLERANCE_LABEL}`, sum.above, "above", "Itens com sobra acima da tolerância (PCP precisa investigar excesso).", { liquido: critLiquido })}
      ${renderAnaliseCard(`FALTA < −${TOLERANCE_LABEL}`, sum.below, "below", "Itens com falta acima da tolerância (perda potencial ou erro de apontamento).", { liquido: critLiquido })}
      ${renderAnaliseCard(`DENTRO ±${TOLERANCE_LABEL}`, sum.tolerance, "tolerance", `Valor líquido das divergências toleradas · bruto ${displayMoney(sum.tolerance.cost)}`, { net: true })}
      ${renderNetDivergCard(sum)}
    </section>

    ${renderCalcExplain(sum)}

    <section class="panel pad">
      <div class="panel-title">
        <div>
          <h3>Análise por planta — divergência e tolerância individual</h3>
          <p>Cada planta calculada separadamente. Clique em "Filtrar" para abrir o detalhamento.</p>
        </div>
      </div>
      ${renderPlantAnalysis(byPlanta)}
    </section>

    <section class="panel pad analise-quick">
      <div class="panel-title">
        <div>
          <h3>Análise rápida — ${escapeHtml(plantLabel)}</h3>
          <p>Quantidade e custo separados pelas duas faixas críticas de tolerância.</p>
        </div>
      </div>
      <div class="quick-grid">
        <article class="quick-card above">
          <header><span class="quick-dot"></span><strong>${displayInt(sum.above.items.length)} itens com SOBRA &gt; +${TOLERANCE_LABEL}</strong></header>
          <div class="quick-cost">${displayMoney(sum.above.cost)}</div>
          <small>Custo absoluto da divergência positiva</small>
        </article>
        <article class="quick-card below">
          <header><span class="quick-dot"></span><strong>${displayInt(sum.below.items.length)} itens com FALTA &lt; −${TOLERANCE_LABEL}</strong></header>
          <div class="quick-cost">${displayMoney(sum.below.cost)}</div>
          <small>Custo absoluto da divergência negativa</small>
        </article>
      </div>
    </section>

    <section class="panel pad">
      <div class="panel-title">
        <div>
          <h3>Itens críticos — fora da tolerância</h3>
          <p>Listagem dos itens com maior impacto fora da faixa de ±${TOLERANCE_LABEL}.</p>
        </div>
        <div class="analise-controls">
          <div class="seg-control">
            <button class="seg-btn ${tab === "financeiro" ? "active" : ""}" data-analise-tab="financeiro" type="button">Impacto financeiro</button>
            <button class="seg-btn ${tab === "percentual" ? "active" : ""}" data-analise-tab="percentual" type="button">Impacto %</button>
          </div>
          <div class="seg-control">
            <button class="seg-btn ${topMode === 5 ? "active" : ""}" data-analise-top="5" type="button">Top 5</button>
            <button class="seg-btn ${topMode === 10 ? "active" : ""}" data-analise-top="10" type="button">Top 10</button>
            <button class="seg-btn ${topMode === "all" ? "active" : ""}" data-analise-top="all" type="button">Todos</button>
          </div>
        </div>
      </div>
      <div class="analise-split">
        ${renderCriticalTable(`SOBRA > +${TOLERANCE_LABEL}`, "above", topItems(sum.above.items, tab, topMode))}
        ${renderCriticalTable(`FALTA < −${TOLERANCE_LABEL}`, "below", topItems(sum.below.items, tab, topMode))}
      </div>
    </section>

    <section class="panel pad">
      <div class="panel-title">
        <div>
          <h3>Análise por material — ${escapeHtml(plantLabel)}</h3>
          <p>Quantidade de itens por faixa de tolerância e custo agregado.</p>
        </div>
      </div>
      ${renderMaterialAnalysis(byMaterial)}
    </section>

    ${renderMonthlyDivergences(monthlyMatrix, plantLabel)}

    <section class="panel pad">
      <div class="panel-title">
        <div>
          <h3>Reincidências mensais — ${escapeHtml(plantLabel)}</h3>
          <p>Snapshots e itens recorrentes desta planta. Salve um snapshot por mês para acompanhar.</p>
        </div>
        <button class="btn primary" id="saveSnapshotButton" type="button">📸 Salvar análise do mês (${escapeHtml(plantLabel)})</button>
      </div>
      ${renderSnapshotsPanel(plantSnapshots, reincidences)}
    </section>
  `;
}

function renderAnaliseCard(label, group, kind, description, opts = {}) {
  // opts.net = true → mostra valor líquido (com sinais) em vez de absoluto
  let costHtml;
  if (opts.net) {
    const net = number(group.net);
    const arrow = net < 0 ? "↓ " : net > 0 ? "↑ " : "";
    costHtml = `${arrow}${displayMoney(Math.abs(net))}`;
  } else {
    costHtml = displayMoney(group.cost);
  }
  const qty = number(group.qty);
  const qtySign = qty > 0 ? "+" : "";
  const qtyClass = qty < 0 ? "neg" : qty > 0 ? "pos" : "";
  let liquidoHtml = "";
  if (opts.liquido !== undefined) {
    const liq = number(opts.liquido);
    const arrow = liq < 0 ? "↓ " : liq > 0 ? "↑ " : "";
    const liqClass = liq < 0 ? "neg" : liq > 0 ? "pos" : "";
    const liqLabel = liq < 0 ? "Falta líquida real" : liq > 0 ? "Sobra líquida real" : "Equilíbrio real";
    liquidoHtml = `<div class="card-liquido ${liqClass}"><span>${liqLabel} (sobra − falta)</span><b>${arrow}${displayMoney(Math.abs(liq))}</b></div>`;
  }
  return `
    <article class="analise-card ${kind}">
      <label>${label}</label>
      <strong>${displayInt(group.items.length)}</strong>
      <div class="card-qty ${qtyClass}">${qtySign}${displayInt(qty)} pçs</div>
      <div class="card-cost">${costHtml}</div>
      ${liquidoHtml}
      <small>${description}</small>
    </article>
  `;
}

// Card especial: NET DIVERG. com total analisado + quebra sobra/falta + total líquido
function renderNetDivergCard(sum) {
  const sobraCost = number(sum.sobra.cost);   // positivo (excesso)
  const faltaCost = number(sum.falta.cost);   // negativo (perda)
  const net = sobraCost + faltaCost;
  const isFalta = net < 0;
  const isSobra = net > 0;
  const directionClass = isFalta ? "net-falta" : isSobra ? "net-sobra" : "net-zero";
  const arrow = isFalta ? "↓" : isSobra ? "↑" : "=";
  const directionLabel = isFalta
    ? "Falta líquida (perda real)"
    : isSobra
      ? "Sobra líquida (excesso real)"
      : "Equilibrado";
  return `
    <article class="analise-card all ${directionClass} net-card">
      <label>NET DIVERG. (sobra − falta)</label>
      <strong>${displayInt(sum.totalAnalyzed)}</strong>
      <span class="net-card-subtotal">itens analisados</span>
      <div class="net-breakdown">
        <div class="net-line sobra">
          <span>${displayInt(sum.sobra.count)} sobra · +${displayInt(sum.sobra.qty)} pçs</span>
          <b>+${displayMoney(sobraCost)}</b>
        </div>
        <div class="net-line falta">
          <span>${displayInt(sum.falta.count)} falta · ${displayInt(sum.falta.qty)} pçs</span>
          <b>${displayMoney(faltaCost)}</b>
        </div>
      </div>
      <div class="card-cost net-value net-final">
        <span class="net-arrow">${arrow}</span>${displayMoney(Math.abs(net))}
      </div>
      <small>${directionLabel}</small>
    </article>
  `;
}

// Painel de transparência: explica como cada métrica é calculada com os números reais
function renderCalcExplain(sum) {
  const sobraCost = number(sum.sobra.cost);
  const faltaCost = number(sum.falta.cost);
  const net = sobraCost + faltaCost;
  const okCount = sum.ok.items.length + (sum.okExtra || 0);
  return `
    <details class="calc-explain">
      <summary>
        <span class="calc-icon">𝑓</span>
        Como estes valores são calculados
        <span class="calc-chevron">▾</span>
      </summary>
      <div class="calc-body">
        <div class="calc-formula">
          <h4>Base do cálculo (por item)</h4>
          <p><b>Comparativo</b> = Inventariado (INV.TOTAL) − Saldo esperado (SALDO NIGURI)</p>
          <p><b>%</b> = Comparativo ÷ Saldo esperado</p>
          <p><b>Custo divergência</b> = Comparativo × Preço unitário</p>
          <p class="calc-note">Comparativo positivo = <span class="t-sobra">sobra</span> (contou mais que o esperado). Negativo = <span class="t-falta">falta</span> (contou menos).</p>
        </div>

        <div class="calc-grid">
          <div class="calc-item above">
            <h5>SOBRA &gt; +${TOLERANCE_LABEL}</h5>
            <p>Itens onde <b>% &gt; +${TOLERANCE_LABEL}</b>.</p>
            <p>${displayInt(sum.above.items.length)} itens · custo bruto ${displayMoney(sum.above.cost)}</p>
          </div>
          <div class="calc-item below">
            <h5>FALTA &lt; −${TOLERANCE_LABEL}</h5>
            <p>Itens onde <b>% &lt; −${TOLERANCE_LABEL}</b>.</p>
            <p>${displayInt(sum.below.items.length)} itens · custo bruto ${displayMoney(sum.below.cost)}</p>
          </div>
          <div class="calc-item tolerance">
            <h5>DENTRO ±${TOLERANCE_LABEL}</h5>
            <p>Itens com divergência mas <b>dentro de ±${TOLERANCE_LABEL}</b> (toleradas).</p>
            <p>${displayInt(sum.tolerance.items.length)} itens · líquido ${displayMoney(sum.tolerance.net)} · bruto ${displayMoney(sum.tolerance.cost)}</p>
            <p class="calc-note">Mostramos o <b>líquido</b> (sobra − falta) porque divergências pequenas tendem a se anular. O bruto somaria os módulos e inflaria o valor.</p>
          </div>
          <div class="calc-item ok">
            <h5>SEM DIVERGÊNCIA</h5>
            <p>Itens onde <b>Inventariado = Saldo</b> (comparativo zero).</p>
            <p>${displayInt(okCount)} itens · R$ 0,00</p>
          </div>
        </div>

        <div class="calc-net">
          <h4>NET DIVERG. — o número que importa para o caixa</h4>
          <div class="calc-net-math">
            <div class="calc-net-row sobra">
              <span>${displayInt(sum.sobra.count)} itens com sobra</span>
              <b>+${displayMoney(sobraCost)}</b>
            </div>
            <div class="calc-net-row falta">
              <span>${displayInt(sum.falta.count)} itens com falta</span>
              <b>${displayMoney(faltaCost)}</b>
            </div>
            <div class="calc-net-row result">
              <span>= NET (impacto real)</span>
              <b class="${net < 0 ? "t-falta" : "t-sobra"}">${net < 0 ? "↓ " : net > 0 ? "↑ " : ""}${displayMoney(Math.abs(net))}</b>
            </div>
          </div>
          <p class="calc-note">
            A quebra acima soma <b>todos</b> os itens divergentes pelo sinal (independente da faixa de tolerância).
            Exemplo: R$ 100 mil de falta e R$ 90 mil de sobra resultam em R$ 10 mil de falta líquida — esse é o impacto real, não R$ 190 mil.
          </p>
        </div>
      </div>
    </details>
  `;
}

function renderCriticalTable(title, kind, items) {
  if (!items.length) {
    return `
      <div class="critical-block ${kind}">
        <h4>${title}</h4>
        <div class="empty-state">Nenhum item nesta faixa.</div>
      </div>
    `;
  }
  const subtotal = items.reduce((s, r) => s + Math.abs(number(r.custoDivergencia)), 0);
  return `
    <div class="critical-block ${kind}">
      <h4>${title} <span class="critical-count">${displayInt(items.length)} itens · ${displayMoney(subtotal)}</span></h4>
      <div class="table-wrap critical-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>P.NUMBER</th>
              <th>MATERIAL</th>
              <th class="num">SALDO NIGURI</th>
              <th class="num">INV. TOTAL</th>
              <th class="num">COMPARATIVO</th>
              <th class="num">%</th>
              <th class="num">CUSTO DIVERG.</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((r, i) => `
              <tr>
                <td class="num">${String(i + 1).padStart(2, "0")}</td>
                <td><strong>${escapeHtml(r.partNumber)}</strong></td>
                <td>${escapeHtml(r.material || "-")}</td>
                <td class="num">${displayInt(r.saldoNiguri)}</td>
                <td class="num">${displayInt(r.invTotal)}</td>
                <td class="num ${number(r.comparativo) >= 0 ? "pos" : "neg"}">${number(r.comparativo) >= 0 ? "+" : ""}${displayInt(r.comparativo)}</td>
                <td class="num">${pctBadge(r.percentual)}</td>
                <td class="num ${number(r.custoDivergencia) >= 0 ? "pos" : "neg"}">${displayMoney(r.custoDivergencia)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMaterialAnalysis(byMaterial) {
  if (!byMaterial.length) return `<div class="empty-state">Sem materiais cadastrados.</div>`;
  return `
    <div class="table-wrap">
      <table class="material-table">
        <thead>
          <tr>
            <th>MATERIAL</th>
            <th class="num">TOTAL</th>
            <th class="num above-th">SOBRA &gt; +${TOLERANCE_LABEL}</th>
            <th class="num below-th">FALTA &lt; −${TOLERANCE_LABEL}</th>
            <th class="num">DENTRO ±${TOLERANCE_LABEL}</th>
            <th class="num pos-th">SOBRA GERAL (&gt;0)</th>
            <th class="num neg-th">FALTA GERAL (&lt;0)</th>
            <th class="num">CUSTO &gt; +${TOLERANCE_LABEL}</th>
            <th class="num">CUSTO &lt; −${TOLERANCE_LABEL}</th>
            <th class="num">CUSTO TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${byMaterial.map((row) => `
            <tr class="drill-target" data-drill="material:${escapeHtml(row.label)}">
              <td><strong>${escapeHtml(row.label)}</strong></td>
              <td class="num">${displayInt(row.total)}</td>
              <td class="num above-cell">${displayInt(row.above)}</td>
              <td class="num below-cell">${displayInt(row.below)}</td>
              <td class="num muted-cell">${displayInt(row.tolerance)}</td>
              <td class="num pos">${displayInt(row.sobraAll)}</td>
              <td class="num neg">${displayInt(row.faltaAll)}</td>
              <td class="num">${displayMoney(row.costAbove)}</td>
              <td class="num">${displayMoney(row.costBelow)}</td>
              <td class="num"><strong>${displayMoney(row.costTotal)}</strong></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================
// Drawer lateral — drill-down de qualquer agregado para itens
// ============================================================

const FIELD_LABELS = {
  cliente: "Cliente",
  fornecedor: "Fornecedor",
  material: "Material",
  unidade: "Planta",
  partNumber: "Part Number",
};

function openDrawer(field, value) {
  state.drawer = { field, value };
  render();
}

function closeDrawer() {
  state.drawer = null;
  render();
}

function getDrawerRecords() {
  if (!state.drawer) return [];
  const { field, value } = state.drawer;
  const baseRecords = filterByPlant(state.records);
  if (field === "unidade") {
    // Para planta, usa filterByPlant que já trata fallback de coluna de estoque
    return filterByPlant(state.records, value);
  }
  return baseRecords.filter((r) => normalize(r[field] || "") === normalize(value));
}

function renderDrawer() {
  if (!state.drawer) return "";
  const { field, value } = state.drawer;
  const records = getDrawerRecords();
  const sum = analiseSummary(records);
  const totalCost = records.reduce((s, r) => s + Math.abs(number(r.custoDivergencia)), 0);
  const fieldLabel = FIELD_LABELS[field] || field;
  const plantInfo = field === "unidade" ? "" : `<span class="drawer-plant">Planta: ${escapeHtml(state.analisePlanta)}</span>`;
  const monthlyHistory = field === "partNumber" ? buildItemMonthlyHistory(value) : [];

  // Ordena: primeiro itens fora da tolerância (sobra+falta), depois por custo
  const sorted = [...records].sort((a, b) => {
    const aClass = classify(a);
    const bClass = classify(b);
    const aOut = aClass === "above" || aClass === "below" ? 1 : 0;
    const bOut = bClass === "above" || bClass === "below" ? 1 : 0;
    if (aOut !== bOut) return bOut - aOut;
    return Math.abs(number(b.custoDivergencia)) - Math.abs(number(a.custoDivergencia));
  });

  return `
    <div class="drawer-backdrop" data-close-drawer="true"></div>
    <aside class="drawer" role="dialog" aria-label="Detalhe de ${escapeHtml(fieldLabel)}">
      <header class="drawer-header">
        <div class="drawer-title">
          <span class="drawer-eyebrow">${escapeHtml(fieldLabel)}</span>
          <h3>${escapeHtml(value)}</h3>
          <div class="drawer-meta">
            <span><strong>${displayInt(records.length)}</strong> itens</span>
            ${plantInfo}
          </div>
        </div>
        <button class="drawer-close" data-close-drawer="true" type="button" aria-label="Fechar">✕</button>
      </header>

      <div class="drawer-kpis">
        <div class="kpi-mini above">
          <label>SOBRA > +${TOLERANCE_LABEL}</label>
          <strong>${displayInt(sum.above.items.length)}</strong>
          <span>${displayMoney(sum.above.cost)}</span>
        </div>
        <div class="kpi-mini below">
          <label>FALTA < −${TOLERANCE_LABEL}</label>
          <strong>${displayInt(sum.below.items.length)}</strong>
          <span>${displayMoney(sum.below.cost)}</span>
        </div>
        <div class="kpi-mini tolerance">
          <label>DENTRO ±${TOLERANCE_LABEL}</label>
          <strong>${displayInt(sum.tolerance.items.length)}</strong>
        </div>
        <div class="kpi-mini total">
          <label>CUSTO TOTAL</label>
          <strong>${displayMoney(totalCost)}</strong>
        </div>
      </div>

      <div class="drawer-body">
        ${renderDrawerMonthlyHistory(monthlyHistory)}
        ${records.length === 0 ? `<div class="empty-state">Nenhum item encontrado para ${escapeHtml(value)}.</div>` : `
          <table class="drawer-table">
            <thead>
              <tr>
                <th>P.NUMBER</th>
                <th>MATERIAL</th>
                ${field !== "cliente" ? "<th>CLIENTE</th>" : ""}
                ${field !== "unidade" ? "<th>UNIDADE</th>" : ""}
                <th class="num">SALDO</th>
                <th class="num">INV.</th>
                <th class="num">COMP.</th>
                <th class="num">%</th>
                <th class="num">CUSTO</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map((r) => {
                const cls = classify(r);
                return `
                  <tr class="drawer-row ${cls}">
                    <td><strong>${escapeHtml(r.partNumber)}</strong></td>
                    <td>${escapeHtml(r.material || "-")}</td>
                    ${field !== "cliente" ? `<td>${escapeHtml(r.cliente || "-")}</td>` : ""}
                    ${field !== "unidade" ? `<td>${escapeHtml(normalizePlant(r.unidade) || "-")}</td>` : ""}
                    <td class="num">${displayInt(r.saldoNiguri)}</td>
                    <td class="num">${displayInt(r.invTotal)}</td>
                    <td class="num ${number(r.comparativo) >= 0 ? "pos" : "neg"}">${number(r.comparativo) >= 0 ? "+" : ""}${displayInt(r.comparativo)}</td>
                    <td class="num">${pctBadge(r.percentual)}</td>
                    <td class="num ${number(r.custoDivergencia) >= 0 ? "pos" : "neg"}">${displayMoney(r.custoDivergencia)}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        `}
      </div>

      <footer class="drawer-footer">
        <button class="btn secondary" data-close-drawer="true" type="button">Fechar</button>
        <button class="btn primary" id="drawerOpenInListButton" type="button">
          Abrir na lista completa →
        </button>
      </footer>
    </aside>
  `;
}

function openDrawerInList() {
  if (!state.drawer) return;
  const { field, value } = state.drawer;
  state.filters = { query: "", status: "all", movimento: "all", fornecedor: "all", material: "all", cliente: "all" };
  if (field === "cliente" || field === "fornecedor" || field === "material") {
    state.filters[field] = value;
  } else {
    // partNumber, unidade e demais campos caem na busca livre
    state.filters.query = value;
  }
  state.view = "inventario";
  state.page = 1;
  state.drawer = null;
  render();
}

// ============================================================
// Snapshots e reincidências
// ============================================================

function computeReincidences(records, snapshots) {
  if (!snapshots.length) return [];
  const currentDivergentPNs = new Set(
    records.filter((r) => classify(r) === "above" || classify(r) === "below").map((r) => r.partNumber),
  );
  const occurrences = new Map();
  snapshots.forEach((snap) => {
    (snap.divergent_items || []).forEach((item) => {
      const pn = item.partNumber;
      if (!pn) return;
      const cur = occurrences.get(pn) || { partNumber: pn, material: item.material, months: [], totalCost: 0 };
      // Mesmo mês com snapshots de várias plantas conta uma vez só
      if (!cur.months.includes(snap.reference_month)) cur.months.push(snap.reference_month);
      cur.totalCost += Math.abs(number(item.custoDivergencia));
      occurrences.set(pn, cur);
    });
  });
  // Itens que aparecem em 2+ snapshots OU também aparecem na análise atual
  return [...occurrences.values()]
    .filter((item) => item.months.length >= 2 || currentDivergentPNs.has(item.partNumber))
    .sort((a, b) => b.months.length - a.months.length || b.totalCost - a.totalCost);
}

// ============================================================
// Divergências mensais por item
// Estoque Físico (INV.TOTAL) − Estoque Sistema (SALDO NIGURI) em cada mês,
// com % sobre o saldo esperado e custo (qtd divergente × preço unitário).
// ============================================================

function snapshotItemEntry(item) {
  return {
    comparativo: number(item.comparativo),
    percentual: number(item.percentual),
    custoDivergencia: number(item.custoDivergencia),
    saldoNiguri: number(item.saldoNiguri),
    material: item.material || "",
    cliente: item.cliente || "",
  };
}

// Monta { months: [chaves ordenadas], items: [{partNumber, months: {chave: dados}, ...}], liveMonth }
// a partir dos snapshots da planta. Se o mês corrente ainda não tem snapshot,
// entra como coluna "atual" com os dados ao vivo.
function computeMonthlyMatrix(snapshots, currentRecords, monthsFilter = null) {
  const allow = monthsFilter && monthsFilter.length ? new Set(monthsFilter) : null;
  const byMonth = new Map();
  snapshots.forEach((snap) => {
    const key = String(snap.reference_month).slice(0, 10);
    if (allow && !allow.has(key)) return;
    // Mais de um snapshot no mesmo mês (ex.: um por planta) soma no mesmo mapa —
    // antes o segundo sobrescrevia o primeiro e o mês "sumia" parcialmente.
    const map = byMonth.get(key) || new Map();
    (snap.divergent_items || []).forEach((item) => {
      if (!item.partNumber) return;
      const entry = snapshotItemEntry(item);
      const prev = map.get(item.partNumber);
      if (prev) {
        prev.comparativo += entry.comparativo;
        prev.custoDivergencia += entry.custoDivergencia;
        prev.saldoNiguri += entry.saldoNiguri;
        if (prev.saldoNiguri) prev.percentual = prev.comparativo / prev.saldoNiguri;
        if (!prev.material) prev.material = entry.material;
        if (!prev.cliente) prev.cliente = entry.cliente;
      } else {
        map.set(item.partNumber, entry);
      }
    });
    byMonth.set(key, map);
  });

  // A comparação mensal mostra APENAS meses com snapshot (dados importados).
  // Não injeta o mês atual a partir da base ao vivo — isso criava uma coluna
  // fantasma (ex.: "Julho · atual") duplicando a base viva de um mês ainda não importado.
  const liveMonth = null;

  const months = [...byMonth.keys()].sort();
  const items = new Map();
  months.forEach((key) => {
    byMonth.get(key).forEach((data, pn) => {
      const cur = items.get(pn) || {
        partNumber: pn,
        material: data.material,
        cliente: data.cliente,
        months: {},
        totalQty: 0,
        totalCost: 0,
        absCost: 0,
      };
      cur.months[key] = data;
      if (!cur.material && data.material) cur.material = data.material;
      cur.totalQty += data.comparativo;
      cur.totalCost += data.custoDivergencia;
      cur.absCost += Math.abs(data.custoDivergencia);
      items.set(pn, cur);
    });
  });
  return {
    months,
    items: [...items.values()].sort((a, b) => b.absCost - a.absCost),
    liveMonth,
  };
}

// ============================================================
// Período analisado (mês/ano ou acumulado) para os dashboards
// ============================================================

function snapshotMonths() {
  return [...new Set(state.snapshots.map((s) => String(s.reference_month).slice(0, 10)))].sort();
}

// Snapshots de um mês. Se houver snapshot "TODAS", usa só ele para não
// somar em dobro com os snapshots por planta do mesmo mês.
function snapshotsForMonth(monthKey) {
  const monthSnaps = state.snapshots.filter((s) => String(s.reference_month).slice(0, 10) === monthKey);
  const todas = monthSnaps.filter((s) => (s.unidade || "TODAS") === "TODAS");
  return todas.length ? todas : monthSnaps;
}

function snapshotItemToRecord(item, monthKey) {
  const record = {
    id: `${monthKey}-${item.partNumber}`,
    rowNumber: "",
    partNumber: item.partNumber,
    saldoNiguri: number(item.saldoNiguri),
    stkSbo: 0,
    processo: 0,
    sorocaba: 0,
    resende: 0,
    invTotal: number(item.invTotal),
    comparativo: number(item.comparativo),
    percentual: number(item.percentual),
    precoUnitario: number(item.precoUnitario),
    custoDivergencia: number(item.custoDivergencia),
    fornecedor: item.fornecedor || "",
    material: item.material || "",
    cliente: item.cliente || "",
    unidade: item.unidade || "",
    status: cleanStatus(item.status),
    acao: "",
    responsavel: "",
    observacao: "",
    revisado: false,
    attentionTags: [],
  };
  record.attentionTags = makeTags(record);
  return record;
}

// Reúne os itens dos meses informados como LINHAS SEPARADAS (uma por mês),
// exatamente como a planilha traz cada linha. NÃO funde por part number nem
// injeta a base ao vivo — assim as contagens e somas batem com a planilha.
function collectMonths(months) {
  const rows = [];
  months.forEach((m) => {
    snapshotsForMonth(m).forEach((s) => {
      (s.divergent_items || []).forEach((item) => {
        if (!item.partNumber) return;
        rows.push(snapshotItemToRecord(item, m));
      });
    });
  });
  return rows;
}

// Total de itens de um mês, incluindo os SEM divergência (que não ficam nos
// itens do snapshot). Vem do campo total_items gravado na importação.
function periodTotalItems() {
  const months = periodMonths();
  if (!months) return state.records.length;
  return months.reduce((n, m) => {
    return n + snapshotsForMonth(m).reduce((a, s) => a + number(s.total_items), 0);
  }, 0);
}

// Meses efetivamente cobertos pelo período selecionado.
function periodMonths() {
  const meses = state.periodoMeses || [];
  if (meses.length) return meses;
  if (state.periodo === "todos") return snapshotMonths();
  return null; // "atual" → base ao vivo
}

// Base de registros conforme o período selecionado:
// meses marcados → linhas desses meses; "todos" → linhas de todos os meses;
// "atual" → base ao vivo (sem snapshots).
function periodRecords() {
  const months = periodMonths();
  if (!months) return state.records;
  return collectMonths(months);
}

function periodoDescription() {
  const meses = state.periodoMeses || [];
  if (meses.length) {
    const withData = new Set(snapshotMonths());
    const semDados = meses.filter((m) => !withData.has(m)).length;
    const base = meses.length === 1
      ? `${formatMonth(meses[0])} — só itens divergentes`
      : `${meses.map(formatMonthName).join(" + ")} — soma dos meses selecionados`;
    return base + (semDados ? ` · ${displayInt(semDados)} sem inventário registrado` : "");
  }
  if (state.periodo === "todos") {
    return `Todos os ${displayInt(snapshotMonths().length)} mês(es) registrados — só itens divergentes`;
  }
  return "Inventário atual (ao vivo)";
}

// Conferência do período: para cada mês selecionado compara o que o snapshot
// GRAVOU na importação (agregados vindos da planilha) com o que é recalculado
// agora a partir dos itens — para verificar se os cards batem com a planilha.
function periodConferenceRows() {
  const months = periodMonths();
  if (!months) return null;
  return months.map((m) => {
    const snaps = snapshotsForMonth(m);
    const stored = snaps.reduce((acc, s) => {
      acc.divItems += (s.divergent_items || []).length;
      acc.above += number(s.items_above);
      acc.below += number(s.items_below);
      acc.tol += number(s.items_in_tolerance);
      acc.costTotal += number(s.cost_total_abs);
      acc.scope.push(s.unidade || "TODAS");
      return acc;
    }, { divItems: 0, above: 0, below: 0, tol: 0, costTotal: 0, scope: [] });
    const sum = analiseSummary(collectMonths([m]));
    const derived = {
      above: sum.above.items.length,
      below: sum.below.items.length,
      tol: sum.tolerance.items.length,
      costTotal: sum.allDivergent.cost,
    };
    const near = (a, b) => Math.abs(number(a) - number(b)) <= Math.max(1, Math.abs(number(a)) * 0.005);
    const ok = snaps.length > 0
      && stored.above === derived.above
      && stored.below === derived.below
      && stored.tol === derived.tol
      && near(stored.costTotal, derived.costTotal);
    return { month: m, hasSnap: snaps.length > 0, stored, derived, ok };
  });
}

function renderPeriodConference() {
  const rows = periodConferenceRows();
  if (!rows) return "";
  const problems = rows.filter((r) => !r.ok).length;
  const cmp = (s, d) => s === d
    ? `<span class="conf-ok">${displayInt(s)}</span>`
    : `<span class="conf-warn">${displayInt(s)} → ${displayInt(d)}</span>`;
  return `
    <details class="calc-explain period-conf" ${problems ? "open" : ""}>
      <summary>
        <span class="calc-icon">✓</span>
        Conferência dos dados do período${problems ? ` — ${displayInt(problems)} mês(es) com divergência de cálculo` : " — cards batem com a planilha"}
        <span class="calc-chevron">▾</span>
      </summary>
      <div class="calc-body">
        <p class="calc-note">Comparação entre o que foi <b>gravado na importação</b> (planilha) e o que os cards <b>recalculam agora</b>. Formato <b>gravado → recalculado</b> quando diferem.</p>
        <div class="table-wrap">
          <table class="conf-table">
            <thead>
              <tr>
                <th>MÊS</th>
                <th class="num">ITENS DIVERG.</th>
                <th class="num">SOBRA &gt; +${TOLERANCE_LABEL}</th>
                <th class="num">FALTA &lt; −${TOLERANCE_LABEL}</th>
                <th class="num">DENTRO ±${TOLERANCE_LABEL}</th>
                <th class="num">CUSTO BRUTO</th>
                <th class="num">OK?</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r) => `
                <tr>
                  <td><strong>${escapeHtml(formatMonth(r.month))}</strong><div class="muted" style="font-size:11px">${r.hasSnap ? escapeHtml([...new Set(r.stored.scope)].join(", ")) : "sem snapshot"}</div></td>
                  <td class="num">${displayInt(r.stored.divItems)}</td>
                  <td class="num">${cmp(r.stored.above, r.derived.above)}</td>
                  <td class="num">${cmp(r.stored.below, r.derived.below)}</td>
                  <td class="num">${cmp(r.stored.tol, r.derived.tol)}</td>
                  <td class="num">${displayMoney(r.stored.costTotal)}</td>
                  <td class="num">${r.hasSnap ? (r.ok ? "✅" : "⚠️") : "—"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <p class="calc-note">A soma das colunas acima é o que aparece nos cards do período. Compare <b>ITENS DIVERG.</b> e <b>CUSTO BRUTO</b> com o total de linhas divergentes da sua planilha de cada mês.</p>
      </div>
    </details>
  `;
}

const MESES_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const PERIODO_ANO_MIN = 2010;
const PERIODO_ANO_MAX = 2050;

// Seletor de período: caixa de rolagem de ANO (2010–2050) + caixa de MÊS
// (janeiro–dezembro). Ao clicar no mês, ele entra na análise; repetindo,
// acumula vários meses. Os selecionados viram chips neon removíveis.
// Reutilizado no dashboard ("completo", com Atual/Todos) e no painel de
// divergências mensais ("meses", com botão Todos os meses).
function renderPeriodoSelector(mode = "completo") {
  const selected = state.periodoMeses || [];
  const selectedSet = new Set(selected);
  const withData = new Set(snapshotMonths());
  const todayKey = monthKeyToday();
  const ano = state.periodoAno || new Date().getFullYear();
  const years = [];
  for (let y = PERIODO_ANO_MIN; y <= PERIODO_ANO_MAX; y += 1) years.push(y);

  const modeChips = mode === "completo"
    ? `
      <button class="chip periodo-chip ${!selectedSet.size && state.periodo === "atual" ? "active" : ""}" data-periodo-mode="atual" type="button">Atual</button>
      <button class="chip periodo-chip ${!selectedSet.size && state.periodo === "todos" ? "active" : ""}" data-periodo-mode="todos" type="button">Todos</button>
    `
    : `
      <button class="chip periodo-chip ${!selectedSet.size ? "active" : ""}" data-periodo-clear type="button">Todos os meses</button>
    `;

  return `
    <div class="periodo-selector">
      ${modeChips}
      <select class="periodo-select" data-periodo-ano aria-label="Ano">
        ${years.map((y) => `<option value="${y}" ${y === ano ? "selected" : ""}>${y}</option>`).join("")}
      </select>
      <select class="periodo-select" data-periodo-mes-select aria-label="Mês">
        <option value="" selected>+ Mês…</option>
        ${MESES_PT.map((nome, i) => {
          const key = `${ano}-${String(i + 1).padStart(2, "0")}-01`;
          const hasData = withData.has(key) || key === todayKey;
          const isSelected = selectedSet.has(key);
          return `<option value="${i + 1}">${nome}${hasData ? " ●" : ""}${isSelected ? " ✓" : ""}</option>`;
        }).join("")}
      </select>
    </div>
    ${selected.length ? `
      <div class="chip-row periodo-chips">
        ${selected.map((m) => {
          const hasData = withData.has(m) || m === todayKey;
          return `
            <button class="chip periodo-chip month active ${hasData ? "" : "no-data"}" data-periodo-mes="${escapeHtml(m)}" type="button"
              title="${hasData ? "Clique para remover da análise" : "Sem inventário registrado neste mês — clique para remover"}">
              ${escapeHtml(formatMonthName(m))}<span class="chip-year">${parseMonthKey(m).getFullYear()}</span><span class="chip-x">✕</span>
            </button>
          `;
        }).join("")}
      </div>
    ` : ""}
  `;
}

// Snapshots que alimentam a matriz mensal de uma planta.
// Planta específica → só os snapshots dela. "TODAS" → por mês, prefere o
// snapshot TODAS; sem ele, une os snapshots por planta daquele mês (a matriz
// soma itens repetidos entre plantas). Antes, meses salvos só por planta
// simplesmente não apareciam na visão "Todas as plantas".
function monthlySnapshotsForPlant(planta) {
  if (planta && planta !== "TODAS") {
    return state.snapshots.filter((s) => (s.unidade || "TODAS") === planta);
  }
  return snapshotMonths().flatMap((m) => snapshotsForMonth(m));
}

// Checagem dos meses selecionados: onde cada um está registrado e com
// quantos itens — para auditar quando um mês "não aparece" na análise.
function renderMonthCheck(planta) {
  const meses = state.periodoMeses || [];
  if (!meses.length) return "";
  const todayKey = monthKeyToday();
  const rows = meses.map((m) => {
    const all = state.snapshots.filter((s) => String(s.reference_month).slice(0, 10) === m);
    const scoped = planta === "TODAS"
      ? snapshotsForMonth(m)
      : all.filter((s) => (s.unidade || "TODAS") === planta);
    const items = scoped.reduce((n, s) => n + (s.divergent_items || []).length, 0);
    let status;
    let ok = true;
    if (!all.length) {
      ok = m === todayKey;
      status = ok ? "sem snapshot — usando o inventário atual (ao vivo)" : "sem inventário registrado — importe a planilha deste mês ou salve um snapshot";
    } else if (!scoped.length) {
      ok = false;
      status = `registrado apenas no escopo: ${all.map((s) => s.unidade || "TODAS").join(", ")} — não entra na planta ${planta}`;
    } else if (!items) {
      ok = false;
      status = `snapshot existe (${scoped.map((s) => s.unidade || "TODAS").join(" + ")}) mas está vazio — refaça a importação/snapshot deste mês`;
    } else {
      status = `${scoped.map((s) => s.unidade || "TODAS").join(" + ")} · ${displayInt(items)} itens divergentes`;
    }
    return { m, ok, status };
  });
  const problems = rows.filter((r) => !r.ok).length;
  return `
    <details class="calc-explain month-check" ${problems ? "open" : ""}>
      <summary>
        <span class="calc-icon">✓</span>
        Checagem dos meses selecionados${problems ? ` — ${displayInt(problems)} com pendência` : " — tudo certo"}
        <span class="calc-chevron">▾</span>
      </summary>
      <div class="calc-body">
        ${rows.map((r) => `
          <div class="month-check-line ${r.ok ? "ok" : "warn"}">
            <strong>${escapeHtml(formatMonth(r.m))}:</strong> ${escapeHtml(r.status)}
          </div>
        `).join("")}
      </div>
    </details>
  `;
}

const MONTHLY_TABLE_LIMIT = 150;

const MONTHLY_SORT_OPTIONS = [
  ["absCost", "Custo absoluto acumulado"],
  ["totalCost", "Total líquido (R$)"],
  ["totalQty", "Total líquido (peças)"],
  ["partNumber", "Part number"],
  ["material", "Material"],
];

// Aplica busca de texto e ordenação escolhidas pelo usuário na tabela mensal.
function filterAndSortMonthly(items) {
  const q = normalize(state.monthlyFilter);
  let list = q
    ? items.filter((it) => normalize([it.partNumber, it.material, it.cliente].join(" ")).includes(q))
    : [...items];
  const dir = state.monthlySortDir === "asc" ? 1 : -1;
  const val = (it) => {
    switch (state.monthlySort) {
      case "totalQty": return it.totalQty;
      case "totalCost": return it.totalCost;
      case "partNumber": return it.partNumber;
      case "material": return it.material || "";
      default: return it.absCost;
    }
  };
  list.sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (typeof va === "string") return va.localeCompare(vb, "pt-BR") * dir;
    return (va - vb) * dir;
  });
  return list;
}

function renderMonthlyControls(totalItems) {
  const dirLabel = state.monthlySortDir === "asc" ? "Menor → maior" : "Maior → menor";
  return `
    <div class="monthly-controls">
      <label class="mc-search">
        <span>Filtrar</span>
        <input id="monthlyFilterInput" value="${escapeHtml(state.monthlyFilter)}" placeholder="Part number, material (ex.: componente), cliente..." />
      </label>
      <label class="mc-sort">
        <span>Ordenar por</span>
        <select id="monthlySortSelect">
          ${MONTHLY_SORT_OPTIONS.map(([value, label]) => `<option value="${value}" ${state.monthlySort === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
      <button class="btn secondary small" id="monthlySortDirButton" type="button">${dirLabel}</button>
    </div>
  `;
}

function renderMonthlyCell(data) {
  if (!data) return `<td class="num"><span class="mdiv-empty">—</span></td>`;
  const comp = number(data.comparativo);
  const dir = comp < 0 ? "neg" : comp > 0 ? "pos" : "";
  const sign = comp > 0 ? "+" : "";
  return `
    <td class="num">
      <div class="mdiv-cell ${dir}">
        <b>${sign}${displayInt(comp)} pçs</b>
        <span class="mdiv-pct">${pctSigned(data.percentual)}</span>
        <em>${displayMoney(data.custoDivergencia)}</em>
      </div>
    </td>
  `;
}

function renderMonthlyDivergences(matrix, plantLabel, planta = state.analisePlanta) {
  const { months, items, liveMonth } = matrix;
  const filtered = (state.periodoMeses || []).length > 0;
  const hasData = months.length && items.length;
  const visible = hasData ? filterAndSortMonthly(items) : [];
  const noMatch = hasData && !visible.length;
  const emptyMessage = noMatch
    ? `<div class="empty-state">Nenhum item corresponde ao filtro "${escapeHtml(state.monthlyFilter)}". Ajuste ou limpe a busca.</div>`
    : filtered
      ? `<div class="empty-state">Nenhum snapshot desta planta nos meses selecionados. Ajuste a seleção de meses acima.</div>`
      : `<div class="empty-state">Salve um snapshot por mês (botão "Salvar análise do mês" no painel de Reincidências mensais, logo abaixo) para comparar as divergências de cada item mês a mês.</div>`;
  // Totais por mês sobre TODOS os itens filtrados (não só os exibidos),
  // para que a coluna de um mês nunca "suma" por causa do limite de linhas.
  const monthTotals = hasData ? months.map((m) => {
    let qty = 0, cost = 0, count = 0;
    visible.forEach((it) => {
      const d = it.months[m];
      if (d) { qty += number(d.comparativo); cost += number(d.custoDivergencia); count += 1; }
    });
    return { m, qty, cost, count };
  }) : [];
  const grandQty = visible.reduce((s, it) => s + number(it.totalQty), 0);
  const grandCost = visible.reduce((s, it) => s + number(it.totalCost), 0);
  const body = !hasData || noMatch
    ? emptyMessage
    : `
      <div class="table-wrap monthly-table-wrap">
        <table class="monthly-table">
          <thead>
            <tr>
              <th>ITEM</th>
              ${months.map((m) => `
                <th class="num ${filtered ? "neon" : ""}">
                  ${escapeHtml(formatMonthName(m))}
                  <small>${escapeHtml(String(parseMonthKey(m).getFullYear()))}${m === liveMonth ? " · atual" : ""}</small>
                </th>
              `).join("")}
              <th class="num">TOTAL LÍQUIDO</th>
            </tr>
          </thead>
          <tbody>
            ${visible.slice(0, MONTHLY_TABLE_LIMIT).map((item) => `
              <tr class="drill-target" data-drill="partNumber:${escapeHtml(item.partNumber)}" title="Clique para ver o detalhe do item">
                <td>
                  <strong>${escapeHtml(item.partNumber)}</strong>
                  <div class="muted mdiv-material">${escapeHtml(item.material || "-")}</div>
                </td>
                ${months.map((m) => renderMonthlyCell(item.months[m])).join("")}
                <td class="num ${item.totalCost < 0 ? "neg" : item.totalCost > 0 ? "pos" : ""}">
                  <div class="mdiv-cell total">
                    <b>${item.totalQty > 0 ? "+" : ""}${displayInt(item.totalQty)} pçs</b>
                    <em>${displayMoney(item.totalCost)}</em>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr class="monthly-total-row">
              <td>TOTAL DO PERÍODO<div class="muted mdiv-material">${displayInt(visible.length)} itens</div></td>
              ${monthTotals.map((t) => `
                <td class="num">
                  <div class="mdiv-cell total ${t.cost < 0 ? "neg" : t.cost > 0 ? "pos" : ""}">
                    <b>${t.qty > 0 ? "+" : ""}${displayInt(t.qty)} pçs</b>
                    <span class="mdiv-pct">${displayInt(t.count)} ${t.count === 1 ? "item" : "itens"}</span>
                    <em>${displayMoney(t.cost)}</em>
                  </div>
                </td>
              `).join("")}
              <td class="num">
                <div class="mdiv-cell total ${grandCost < 0 ? "neg" : grandCost > 0 ? "pos" : ""}">
                  <b>${grandQty > 0 ? "+" : ""}${displayInt(grandQty)} pçs</b>
                  <em>${displayMoney(grandCost)}</em>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      ${visible.length > MONTHLY_TABLE_LIMIT ? `<p class="muted" style="margin-bottom:0">Mostrando ${MONTHLY_TABLE_LIMIT} de ${displayInt(visible.length)} itens (ordenados por ${escapeHtml(monthlySortLabel())}). A linha <b>TOTAL DO PERÍODO</b> soma todos os itens, inclusive os não exibidos.</p>` : `<p class="muted" style="margin-bottom:0">${displayInt(visible.length)} item(ns) · ordenados por ${escapeHtml(monthlySortLabel())}.</p>`}
    `;
  return `
    <section class="panel pad">
      <div class="panel-title">
        <div>
          <h3>Divergências mensais por item — ${escapeHtml(plantLabel)}</h3>
          <p>Período identificado por mês de inventário. Cada célula mostra: divergência em peças (Estoque Físico − Sistema), % sobre o saldo esperado e custo (qtd × preço unitário). Selecione os meses para refinar a comparação.</p>
        </div>
      </div>
      ${renderPeriodoSelector("meses")}
      ${renderMonthCheck(planta)}
      ${hasData ? renderMonthlyControls(items.length) : ""}
      ${body}
    </section>
  `;
}

function monthlySortLabel() {
  const opt = MONTHLY_SORT_OPTIONS.find(([v]) => v === state.monthlySort);
  const dir = state.monthlySortDir === "asc" ? "menor→maior" : "maior→menor";
  return `${opt ? opt[1] : "Custo"} (${dir})`;
}

// Histórico mensal de um part number (para o drawer), no formato:
// Abril: Divergência de -325 pçs (-4,0%) | Custo da divergência: -R$ 1.074,57
function buildItemMonthlyHistory(partNumber) {
  const planta = state.analisePlanta;
  const matrix = computeMonthlyMatrix(monthlySnapshotsForPlant(planta), filterByPlant(state.records), state.periodoMeses);
  const item = matrix.items.find((i) => normalize(i.partNumber) === normalize(partNumber));
  if (!item) return [];
  return matrix.months
    .filter((m) => item.months[m])
    .map((m) => ({ monthKey: m, live: m === matrix.liveMonth, ...item.months[m] }));
}

function renderDrawerMonthlyHistory(history) {
  if (!history.length) return "";
  return `
    <div class="drawer-monthly">
      <h4>Divergência mensal por inventário</h4>
      ${history.map((h) => {
        const comp = number(h.comparativo);
        const dir = comp < 0 ? "neg" : "pos";
        const sign = comp > 0 ? "+" : "";
        return `
          <div class="mhist-line ${dir}">
            <strong>${escapeHtml(formatMonth(h.monthKey))}${h.live ? " (atual)" : ""}:</strong>
            Divergência de <b>${sign}${displayInt(comp)} pçs</b> (${pctSigned(h.percentual)})
            <span class="mhist-sep">|</span>
            Custo da divergência: <b>${displayMoney(h.custoDivergencia)}</b>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderSnapshotsPanel(snapshots, reincidences) {
  return `
    <div class="snapshots-grid">
      <div class="snapshots-list">
        <h4>Snapshots salvos</h4>
        ${snapshots.length === 0 ? `<div class="empty-state">Nenhum snapshot salvo ainda. Clique em "Salvar análise do mês" para registrar.</div>` : `
          <div class="snapshot-cards">
            ${snapshots.map((s) => `
              <article class="snapshot-card">
                <header>
                  <div>
                    <strong>${formatMonth(s.reference_month)}</strong>
                    <span class="snap-plant">${escapeHtml(s.unidade || "TODAS")}</span>
                  </div>
                  <button class="btn ghost small" data-delete-snapshot="${escapeHtml(s.id)}" type="button">Excluir</button>
                </header>
                <div class="snap-stats">
                  <span><b>${displayInt(s.items_above)}</b> &gt;+${TOLERANCE_LABEL}</span>
                  <span><b>${displayInt(s.items_below)}</b> &lt;−${TOLERANCE_LABEL}</span>
                  <span class="snap-cost">${displayMoney(number(s.cost_total_abs))}</span>
                </div>
              </article>
            `).join("")}
          </div>
        `}
      </div>
      <div class="reincidences">
        <h4>Itens recorrentes ${reincidences.length ? `<span class="critical-count">${displayInt(reincidences.length)} itens</span>` : ""}</h4>
        ${reincidences.length === 0 ? `<div class="empty-state">Salve pelo menos 2 snapshots para identificar reincidências.</div>` : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>P.NUMBER</th>
                  <th>MATERIAL</th>
                  <th class="num">MESES</th>
                  <th class="num">CUSTO ACUMULADO</th>
                </tr>
              </thead>
              <tbody>
                ${reincidences.slice(0, 30).map((r) => `
                  <tr>
                    <td><strong>${escapeHtml(r.partNumber)}</strong></td>
                    <td>${escapeHtml(r.material || "-")}</td>
                    <td class="num"><span class="months-badge">${r.months.length}×</span></td>
                    <td class="num">${displayMoney(r.totalCost)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
}

// Datas de referência chegam como "2026-04-01"; new Date(str) interpretaria como UTC
// e no fuso do Brasil mostraria o mês anterior — por isso o parse manual.
function parseMonthKey(dateStr) {
  const [y, m] = String(dateStr).split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, 1);
}

function monthKeyToday() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatMonth(dateStr) {
  if (!dateStr) return "-";
  return parseMonthKey(dateStr)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
}

function formatMonthName(dateStr) {
  if (!dateStr) return "-";
  return parseMonthKey(dateStr)
    .toLocaleDateString("pt-BR", { month: "long" })
    .replace(/^./, (c) => c.toUpperCase());
}

function pctSigned(value) {
  const pct = number(value) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

async function autoClassifyPlants() {
  const targets = state.records.filter((r) => !normalizePlant(r.unidade));
  if (!targets.length) {
    showToast("Todos os itens já estão classificados");
    return;
  }
  if (!window.confirm(`Classificar ${targets.length} itens automaticamente pela coluna de estoque dominante (SBO / Sorocaba / Resende)?`)) return;

  const updated = state.records.map((r) => {
    if (normalizePlant(r.unidade)) return r;
    const sbo = number(r.stkSbo);
    const sor = number(r.sorocaba);
    const res = number(r.resende);
    const max = Math.max(sbo, sor, res);
    let unidade = "";
    if (max > 0) {
      if (max === sbo) unidade = "SBO";
      else if (max === sor) unidade = "SOROCABA";
      else if (max === res) unidade = "RESENDE";
    }
    return { ...r, unidade };
  });

  state.records = updated;
  render();
  showToast(`${targets.length} itens classificados — sincronizando...`);
  try {
    await persistBatch(state.records);
    showToast("Classificação salva no servidor");
  } catch (err) {
    console.error("Auto-classify:", err);
    showToast("Erro ao sincronizar classificação", "error");
  }
}

function buildSnapshotPayload(records, refMonth, planta) {
  const sum = analiseSummary(records);
  const divergentItems = [...sum.above.items, ...sum.below.items, ...sum.tolerance.items].map((r) => ({
    partNumber: r.partNumber,
    material: r.material,
    cliente: r.cliente,
    fornecedor: r.fornecedor,
    unidade: r.unidade,
    saldoNiguri: r.saldoNiguri,
    invTotal: r.invTotal,
    comparativo: r.comparativo,
    percentual: r.percentual,
    custoDivergencia: r.custoDivergencia,
    precoUnitario: r.precoUnitario,
    status: r.status,
  }));
  return {
    user_id: state.user.id,
    reference_month: refMonth,
    unidade: planta,
    total_items: records.length,
    items_above: sum.above.items.length,
    items_below: sum.below.items.length,
    items_in_tolerance: sum.tolerance.items.length,
    cost_above: sum.above.cost,
    cost_below: sum.below.cost,
    cost_total_abs: sum.allDivergent.cost,
    divergent_items: divergentItems,
  };
}

async function saveSnapshot() {
  const planta = state.analisePlanta;
  const records = filterByPlant(state.records);
  if (!records.length) {
    showToast("Nenhum dado para salvar nesta planta", "error");
    return;
  }
  const payload = buildSnapshotPayload(records, monthKeyToday(), planta);
  const refMonth = payload.reference_month;
  showToast("Salvando snapshot...");
  const { error } = await db
    .from("inventory_snapshots")
    .upsert(payload, { onConflict: "user_id,reference_month,unidade" });
  if (error) {
    console.error("Snapshot error:", error);
    showToast("Erro ao salvar snapshot", "error");
    return;
  }
  await loadSnapshots();
  showToast(`Snapshot de ${formatMonth(refMonth)} — ${planta} salvo`);
  render();
}

async function loadSnapshots() {
  const { data, error } = await db
    .from("inventory_snapshots")
    .select("*")
    .eq("user_id", state.user.id)
    .order("reference_month", { ascending: false });
  if (error) {
    console.error("Load snapshots:", error);
    state.snapshots = [];
    return;
  }
  state.snapshots = data || [];
}

async function deleteSnapshot(id) {
  if (!window.confirm("Excluir esse snapshot?")) return;
  const { error } = await db.from("inventory_snapshots").delete().eq("id", id).eq("user_id", state.user.id);
  if (error) {
    showToast("Erro ao excluir", "error");
    return;
  }
  state.snapshots = state.snapshots.filter((s) => s.id !== id);
  showToast("Snapshot excluído");
  render();
}

function renderPartNumberBars(title, records, subtitle) {
  const max = Math.max(1, ...records.map((record) => Math.abs(number(record.custoDivergencia))));
  return `
    <section class="panel pad chart-panel">
      <div class="panel-title">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        <button class="btn secondary small" data-view="partnumber" type="button">Detalhar</button>
      </div>
      ${records.length ? `
        <div class="vertical-chart pro-chart" data-count="${records.length}">
          ${records.map((record) => {
            const cost = Math.abs(number(record.custoDivergencia));
            const comp = number(record.comparativo);
            const pct = number(record.percentual);
            const qty = Math.abs(comp);
            const direction = comp >= 0 ? "sobra" : "falta";
            const pctSign = pct >= 0 ? "+" : "";
            const pctText = `${pctSign}${(pct * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
            return `
              <article class="bar-column drill-target" data-direction="${direction}" data-drill="partNumber:${escapeHtml(record.partNumber)}" title="Clique para ver detalhes">
                <div class="bar-value">${displayMoney(cost)}</div>
                <div class="bar-pillar" style="--h:${Math.max(5, cost / max * 100)}%">
                  <span></span>
                  <em class="bar-pct">${pctText}</em>
                </div>
                <strong title="${escapeHtml(record.partNumber)}">${escapeHtml(record.partNumber)}</strong>
                <small>
                  <span class="bar-direction ${direction}">${direction === "sobra" ? "▲ SOBRA" : "▼ FALTA"}</span>
                  ${displayInt(qty)} pçs · ${escapeHtml(record.cliente || "-")}
                </small>
              </article>
            `;
          }).join("")}
        </div>
        <div class="chart-foot">Itens: ${displayInt(records.length)} | Top ${topLimit()} | Fonte: custo divergente absoluto · cor indica sobra (ciano) ou falta (vermelho)</div>
      ` : `<div class="empty-state">Nenhuma divergência encontrada para os filtros atuais.</div>`}
    </section>
  `;
}

function topPartNumbersByPct(records, limit = topLimit()) {
  return [...records]
    .filter((record) => Math.abs(number(record.percentual)) > 0 && number(record.saldoNiguri) !== 0)
    .sort((a, b) => Math.abs(number(b.percentual)) - Math.abs(number(a.percentual)))
    .slice(0, limit);
}

function renderPartNumberPctBars(title, records, subtitle) {
  const max = Math.max(0.001, ...records.map((record) => Math.abs(number(record.percentual))));
  return `
    <section class="panel pad chart-panel">
      <div class="panel-title">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(subtitle)}</p>
        </div>
      </div>
      ${records.length ? `
        <div class="vertical-chart pro-chart pct-chart" data-count="${records.length}">
          ${records.map((record) => {
            const pct = number(record.percentual);
            const absPct = Math.abs(pct);
            const cost = Math.abs(number(record.custoDivergencia));
            const comp = number(record.comparativo);
            const qty = Math.abs(comp);
            const direction = comp >= 0 ? "sobra" : "falta";
            const pctSign = pct >= 0 ? "+" : "";
            const pctText = `${pctSign}${(pct * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
            return `
              <article class="bar-column drill-target" data-direction="${direction}" data-drill="partNumber:${escapeHtml(record.partNumber)}" title="Clique para ver detalhes">
                <div class="bar-value">${pctText}</div>
                <div class="bar-pillar" style="--h:${Math.max(5, absPct / max * 100)}%">
                  <span></span>
                  <em class="bar-pct money">${displayMoney(cost)}</em>
                </div>
                <strong title="${escapeHtml(record.partNumber)}">${escapeHtml(record.partNumber)}</strong>
                <small>
                  <span class="bar-direction ${direction}">${direction === "sobra" ? "▲ SOBRA" : "▼ FALTA"}</span>
                  ${displayInt(qty)} pçs · ${escapeHtml(record.cliente || "-")}
                </small>
              </article>
            `;
          }).join("")}
        </div>
        <div class="chart-foot">Itens: ${displayInt(records.length)} | Top ${topLimit()} | Fonte: percentual absoluto de divergência (|Inv − Saldo| / Saldo)</div>
      ` : `<div class="empty-state">Nenhuma divergência encontrada para os filtros atuais.</div>`}
    </section>
  `;
}

function renderRankingChart(title, rows, subtitle, field = null) {
  const max = Math.max(1, ...rows.map((row) => row.cost));
  return `
    <section class="panel pad chart-panel">
      <div class="panel-title">
        <div>
          <h3>${title}</h3>
          <p>${subtitle}</p>
        </div>
      </div>
      <div class="rank-chart" data-count="${rows.length}">
        ${rows.map((row, index) => `
          <article class="rank-line ${field ? "drill-target" : ""}" ${field ? `data-drill="${field}:${escapeHtml(row.label)}"` : ""}>
            <div class="rank-head">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</strong>
              <b>${displayMoney(row.cost)}</b>
            </div>
            <div class="bar-track tall"><span style="--w:${Math.max(2, row.cost / max * 100)}%"></span></div>
            <small>${displayInt(row.items)} itens · ${displayInt(row.qty)} peças divergentes</small>
          </article>
        `).join("") || `<div class="empty-state">Sem dados para ranquear.</div>`}
      </div>
    </section>
  `;
}

function renderAttentionDonut(records) {
  const segments = statusSegments(records);
  const total = Math.max(1, records.length);
  let cursor = 0;
  const gradient = segments.map(([, value, color]) => {
    const start = cursor;
    cursor += value / total * 100;
    return `${color} ${start}% ${cursor}%`;
  }).join(", ");
  return `
    <section class="panel pad chart-panel">
      <div class="panel-title">
        <div>
          <h3>Curva de atenção</h3>
          <p>Distribuição dos itens por criticidade atual.</p>
        </div>
      </div>
      <div class="donut-wrap">
        <div class="donut" style="background:conic-gradient(${gradient})">
          <div>
            <strong>${displayInt(stats(records).urgent + stats(records).critical)}</strong>
            <span>críticos</span>
          </div>
        </div>
        <div class="donut-legend">
          ${segments.map(([label, value, color]) => `
            <div><span style="background:${color}"></span><strong>${label}</strong><b>${displayInt(value)}</b></div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderMovementChart(records) {
  const rows = groupMovement(records);
  const max = Math.max(1, ...rows.map((row) => row.cost));
  return `
    <section class="panel pad chart-panel">
      <div class="panel-title">
        <div>
          <h3>Falta x sobra</h3>
          <p>Separação por movimento de inventário.</p>
        </div>
      </div>
      <div class="movement-bars">
        ${rows.map((row) => `
          <article class="movement-card ${normalize(row.label)}">
            <div>
              <strong>${row.label}</strong>
              <span>${displayInt(row.items)} itens</span>
            </div>
            <b>${displayMoney(row.cost)}</b>
            <div class="bar-track"><span style="--w:${Math.max(2, row.cost / max * 100)}%"></span></div>
            <small>${displayInt(row.qty)} peças</small>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderLocationChart(records) {
  const s = stats(records);
  const rows = Object.entries(s.locations).map(([label, value]) => ({ label, value }));
  const max = Math.max(1, ...rows.map((row) => row.value));
  return `
    <section class="panel pad chart-panel">
      <div class="panel-title">
        <div>
          <h3>Saldo por setor</h3>
          <p>Volume físico por localização da base filtrada.</p>
        </div>
      </div>
      <div class="sector-chart">
        ${rows.map((row) => `
          <article>
            <strong>${escapeHtml(row.label)}</strong>
            <div class="sector-tower"><span style="height:${Math.max(4, row.value / max * 100)}%"></span></div>
            <b>${displayInt(row.value)}</b>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderPriorityRow(record) {
  const compClass = number(record.comparativo) < 0 ? "negative" : number(record.comparativo) > 0 ? "positive" : "";
  return `
    <article class="priority-row">
      <div>
        <div class="part">${escapeHtml(record.partNumber)}</div>
        <div class="muted" style="font-size:12px">${escapeHtml(record.material || "-")} · ${escapeHtml(record.cliente || "-")}</div>
      </div>
      <div class="tag-row">${(record.attentionTags || []).slice(0, 4).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") || '<span class="tag">Sem alerta</span>'}</div>
      <div class="num ${compClass}">${displayInt(record.comparativo)}</div>
      <div class="num ${compClass}">${displayMoney(record.custoDivergencia)}</div>
      <div class="inline-actions">
        ${statusBadge(record.status)}
        <button class="btn ghost small" data-action="point" data-id="${record.id}" data-pn="${escapeHtml(record.partNumber)}" type="button">Apontar</button>
      </div>
    </article>
  `;
}

function renderActionSummary() {
  const s = stats();
  const total = Math.max(1, state.records.length);
  const rows = [
    ["Revisados", s.reviewed, "var(--green)"],
    ["Com apontamento", s.notes, "var(--cyan)"],
    ["Urgentes", s.urgent, "var(--red)"],
    ["Críticos", s.critical, "var(--orange)"],
  ];
  return `
    <div class="bar-list">
      ${rows.map(([label, value, color]) => `
        <div class="bar-row">
          <strong>${label}</strong>
          <div class="bar-track"><span style="--w:${Math.min(100, value / total * 100)}%;background:${color}"></span></div>
          <span class="num">${displayInt(value)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderBarPanel(title, rows) {
  const max = Math.max(1, ...rows.map((row) => row.cost));
  return `
    <div class="panel pad">
      <div class="panel-title">
        <div>
          <h3>${title}</h3>
          <p>Ranking por custo absoluto da divergência.</p>
        </div>
      </div>
      <div class="bar-list">
        ${rows.map((row) => `
          <div class="bar-row">
            <strong title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</strong>
            <div class="bar-track"><span style="--w:${Math.max(2, row.cost / max * 100)}%"></span></div>
            <span class="num">${displayMoney(row.cost)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderCostView() {
  const rows = activeRows();
  return `
    ${renderPcpFilters(rows)}
    ${renderKpis(rows)}
    <section class="cost-hero panel pad">
      <div class="panel-title">
        <div>
          <h3>Demonstrativo de custo para PCP</h3>
          <p>Leitura por valor financeiro, quantidade divergente e agrupamentos de maior impacto.</p>
        </div>
      </div>
      <div class="cost-summary">
        <article>
          <label>Custo absoluto</label>
          <strong>${displayMoney(stats(rows).costAbs)}</strong>
          <span>Total em divergência independente de falta ou sobra.</span>
        </article>
        <article>
          <label>Saldo financeiro</label>
          <strong class="${stats(rows).costSaldo < 0 ? "negative" : "positive"}">${displayMoney(stats(rows).costSaldo)}</strong>
          <span>Resultado líquido do comparativo de inventário.</span>
        </article>
        <article>
          <label>Quantidade absoluta</label>
          <strong>${displayInt(stats(rows).qtyAbs)}</strong>
          <span>Peças que exigem validação física ou sistêmica.</span>
        </article>
      </div>
    </section>
    <section class="chart-stack">
      <div class="chart-grid">
        ${renderRankingChart("Fornecedores por custo", groupTop(rows, "fornecedor", "custoDivergencia", topLimit()), "Onde o valor divergente está concentrado.", "fornecedor")}
        ${renderRankingChart("Clientes por custo", groupTop(rows, "cliente", "custoDivergencia", topLimit()), "Visão para priorizar a rotina de PCP por cliente.", "cliente")}
      </div>
      <div class="chart-grid">
        ${renderRankingChart("Materiais por custo", groupTop(rows, "material", "custoDivergencia", topLimit()), "Famílias e descrições com maior exposição.", "material")}
        ${renderMovementChart(rows)}
      </div>
    </section>
  `;
}

function renderPartNumberView() {
  const rows = activeRows();
  const topByCost = topPartNumbers(rows, topLimit());
  const topByPct = topPartNumbersByPct(rows, topLimit());
  return `
    ${renderPcpFilters(rows)}
    ${renderKpis(rows)}
    <section class="chart-stack">
      ${renderPartNumberBars(
        "Divergência por part number — impacto financeiro",
        topByCost,
        "Ranking por R$ divergente. Cor da barra indica sobra (ciano) ou falta (vermelho); % no topo da barra mostra a representação proporcional ao saldo.",
      )}
      ${renderPartNumberPctBars(
        "Divergência por part number — impacto percentual",
        topByPct,
        "Ranking pelo % mais distante do saldo esperado. Útil para identificar itens com pouco volume mas alto desvio relativo.",
      )}
      <section class="panel pad">
        <div class="panel-title">
          <div>
            <h3>Detalhamento dos itens</h3>
            <p>Cada card mostra cliente, fornecedor, quantidade e custo divergente. Clique em "Apontar" para registrar tratativa.</p>
          </div>
        </div>
        <div class="part-card-grid">
          ${topByCost.map((record, index) => renderPartInsight(record, index)).join("") || `<div class="empty-state">Sem itens divergentes para exibir.</div>`}
        </div>
      </section>
    </section>
  `;
}

function renderPartInsight(record, index) {
  const comp = number(record.comparativo);
  const compClass = comp < 0 ? "negative" : comp > 0 ? "positive" : "";
  return `
    <article class="part-insight panel">
      <div class="part-rank">${String(index + 1).padStart(2, "0")}</div>
      <div>
        <div class="part">${escapeHtml(record.partNumber)}</div>
        <p>${escapeHtml(record.material || "-")}</p>
      </div>
      <div class="part-metrics">
        <span>Cliente <b>${escapeHtml(record.cliente || "-")}</b></span>
        <span>Fornecedor <b>${escapeHtml(record.fornecedor || "-")}</b></span>
        <span>Qtd. <b class="${compClass}">${displayInt(record.comparativo)}</b></span>
        <span>Custo <b class="${compClass}">${displayMoney(record.custoDivergencia)}</b></span>
      </div>
      <div class="inline-actions">
        ${statusBadge(record.status)}
        <button class="btn secondary small" data-action="point" data-id="${record.id}" data-pn="${escapeHtml(record.partNumber)}" type="button">Apontar</button>
      </div>
    </article>
  `;
}

function renderInventory() {
  const rows = filteredRecords(periodRecords());
  const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const pageRows = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
  return `
    <section class="panel pad periodo-panel">
      <div class="panel-title">
        <div>
          <h3>Período analisado</h3>
          <p>A lista reflete o inventário do período selecionado.</p>
        </div>
        <span class="periodo-desc">${escapeHtml(periodoDescription())}</span>
      </div>
      ${renderPeriodoSelector("completo")}
    </section>
    ${renderKpis(rows)}
    ${renderFilters()}
    <section class="panel">
      <div class="table-wrap">${renderTable(pageRows)}</div>
      <div class="table-footer">
        <span class="muted">${displayInt(rows.length)} item(ns) encontrados · página ${state.page} de ${totalPages}</span>
        <div class="inline-actions">
          <button class="btn secondary small" id="prevPageButton" type="button" ${state.page <= 1 ? "disabled" : ""}>Anterior</button>
          <button class="btn secondary small" id="nextPageButton" type="button" ${state.page >= totalPages ? "disabled" : ""}>Próxima</button>
        </div>
      </div>
    </section>
  `;
}

function renderFilters() {
  return `
    <section class="panel filter-panel">
      <div class="panel-title">
        <div>
          <h3>Filtros e ordenação</h3>
          <p>Localize part number, fornecedor, material, cliente, divergência ou apontamento.</p>
        </div>
        <button class="btn ghost small" id="clearFiltersButton" type="button">Limpar filtros</button>
      </div>
      <div class="filters">
        <label>Busca
          <input id="queryFilter" value="${escapeHtml(state.filters.query)}" placeholder="Part number, fornecedor, material..." />
        </label>
        <label>Status
          <select id="statusFilter" class="status-select">${statusSelectOptions(state.filters.status)}</select>
        </label>
        <label>Movimento
          <select id="movementFilter" class="status-select">${movementSelectOptions(state.filters.movimento)}</select>
        </label>
        <label>Fornecedor
          <select id="supplierFilter">${selectOptions(["all", ...unique("fornecedor")], state.filters.fornecedor, "Todos")}</select>
        </label>
        <label>Material
          <select id="materialFilter">${selectOptions(["all", ...unique("material")], state.filters.material, "Todos")}</select>
        </label>
        <label>Cliente
          <select id="clientFilter">${selectOptions(["all", ...unique("cliente")], state.filters.cliente, "Todos")}</select>
        </label>
      </div>
      <div class="toolbar" style="margin-top:12px">
        <label style="max-width:220px">Ordenar
          <select id="sortBy">
            ${[
              ["risk", "Prioridade"],
              ["custoDivergencia", "Custo divergente"],
              ["comparativo", "Quantidade divergente"],
              ["percentual", "Percentual"],
              ["partNumber", "Part number"],
              ["fornecedor", "Fornecedor"],
              ["material", "Material"],
              ["status", "Status"],
            ].map(([value, label]) => `<option value="${value}" ${state.sortBy === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <button class="btn secondary small" id="toggleSortButton" type="button">${state.sortDir === "desc" ? "Maior primeiro" : "Menor primeiro"}</button>
      </div>
    </section>
  `;
}

function selectOptions(values, selected, allLabel) {
  return values.map((value) => {
    const label = value === "all" ? allLabel : value;
    return `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");
}

const STATUS_COLORS = {
  OK: "#00d084",
  "Atenção": "#ffd24a",
  "Crítico": "#ff8a34",
  "Urgente": "#ff426d",
};

const MOVEMENT_COLORS = {
  Falta: "#ff426d",
  Sobra: "#00d8ff",
  OK: "#00d084",
};

function statusSelectOptions(selected) {
  const values = ["all", "OK", "Atenção", "Crítico", "Urgente"];
  return values.map((value) => {
    const label = value === "all" ? "● Todos" : `● ${value}`;
    const color = value === "all" ? "#7d8297" : STATUS_COLORS[value];
    return `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""} style="color:${color};background:#12141b;font-weight:700">${escapeHtml(label)}</option>`;
  }).join("");
}

function movementSelectOptions(selected) {
  const values = ["all", "Falta", "Sobra", "OK"];
  return values.map((value) => {
    const label = value === "all" ? "● Todos" : `● ${value}`;
    const color = value === "all" ? "#7d8297" : MOVEMENT_COLORS[value];
    return `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""} style="color:${color};background:#12141b;font-weight:700">${escapeHtml(label)}</option>`;
  }).join("");
}

function renderTable(rows) {
  if (!rows.length) return `<div class="empty-state">Nenhum item encontrado com os filtros atuais.</div>`;
  return `
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>P.Number</th>
          <th>Saldo Niguri</th>
          <th>Inv. Total</th>
          <th>Comparativo</th>
          <th>%</th>
          <th>Custo diverg.</th>
          <th>Fornecedor</th>
          <th>Material / Cliente</th>
          <th>Locais</th>
          <th>Tratativa</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((record) => renderTableRow(record)).join("")}
      </tbody>
    </table>
  `;
}

function renderTableRow(record) {
  const comp = number(record.comparativo);
  const compClass = comp < 0 ? "negative" : comp > 0 ? "positive" : "";
  return `
    <tr>
      <td>${statusBadge(record.status)}</td>
      <td>
        <div class="part">${escapeHtml(record.partNumber)}</div>
        <div class="muted" style="font-size:11px">linha ${record.rowNumber || "-"}</div>
      </td>
      <td class="num">${displayQty(record.saldoNiguri)}</td>
      <td class="num">${displayQty(record.invTotal)}</td>
      <td class="num ${compClass}">${displayQty(record.comparativo)}</td>
      <td class="num ${compClass}">${displayPct(record.percentual)}</td>
      <td class="num ${compClass}">${displayMoney(record.custoDivergencia)}</td>
      <td>
        <strong>${escapeHtml(record.fornecedor || "-")}</strong>
        <div class="tag-row" style="margin-top:5px">${(record.attentionTags || []).slice(0, 3).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      </td>
      <td>
        <strong>${escapeHtml(record.material || "-")}</strong>
        <div class="muted" style="font-size:12px">${escapeHtml(record.cliente || "-")}</div>
      </td>
      <td>${renderLocationBars(record)}</td>
      <td>
        ${record.revisado ? '<span class="reviewed">Revisado</span>' : '<span class="muted">Pendente</span>'}
        ${record.acao ? `<div style="font-size:12px">${escapeHtml(record.acao)}</div>` : ""}
        ${record.responsavel ? `<div class="muted" style="font-size:11px">${escapeHtml(record.responsavel)}</div>` : ""}
      </td>
      <td>
        <div class="inline-actions">
          <button class="btn secondary small" data-action="edit" data-id="${record.id}" data-pn="${escapeHtml(record.partNumber)}" type="button">Editar</button>
          <button class="btn secondary small" data-action="point" data-id="${record.id}" data-pn="${escapeHtml(record.partNumber)}" type="button">Apontar</button>
          <button class="btn danger small" data-action="delete" data-id="${record.id}" data-pn="${escapeHtml(record.partNumber)}" type="button">Excluir</button>
        </div>
      </td>
    </tr>
  `;
}

function renderLocationBars(record) {
  const values = [
    ["STK SBO", record.stkSbo, "var(--cyan)"],
    ["Processo", record.processo, "var(--yellow)"],
    ["Sorocaba", record.sorocaba, "var(--blue)"],
    ["Resende", record.resende, "var(--green)"],
  ];
  const max = Math.max(1, ...values.map(([, value]) => number(value)));
  return `
    <div class="location-stack">
      ${values.map(([label, value, color]) => `
        <div class="loc-line">
          <span>${label}</span>
          <div class="loc-bar"><span style="width:${Math.max(1, number(value) / max * 100)}%;background:${color}"></span></div>
          <strong class="num">${displayQty(value)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderDivergences() {
  const divergent = activeRows()
    .filter((r) => number(r.comparativo) !== 0)
    .sort((a, b) => riskScore(b) - riskScore(a));
  return `
    ${renderPcpFilters(divergent)}
    ${renderKpis(divergent)}
    <section class="chart-stack">
      ${renderPartNumberBars("Soma das divergências por maior impacto", topPartNumbers(divergent), "Cor indica sobra ou falta; % no topo mostra o impacto proporcional ao saldo. Clique em uma barra para ver detalhes.")}
      <div class="chart-grid thirds">
        ${renderMovementChart(divergent)}
        ${renderAttentionDonut(divergent)}
        ${renderRankingChart("Fornecedores no radar", groupTop(divergent, "fornecedor", "custoDivergencia", topLimit()), "Custo absoluto por fornecedor.", "fornecedor")}
      </div>
      <div class="chart-grid">
        ${renderRankingChart("Materiais no radar", groupTop(divergent, "material", "custoDivergencia", topLimit()), "Material com maior divergência financeira.", "material")}
        ${renderActionPanel(divergent)}
      </div>
    </section>
  `;
}

function renderDivergenceBreakdown(records) {
  const s = stats(records);
  const total = Math.max(1, records.length);
  const rows = [
    ["Falta", s.falta, "var(--red)"],
    ["Sobra", s.sobra, "var(--green)"],
    ["Urgente", s.urgent, "var(--orange)"],
    ["Revisado", s.reviewed, "var(--cyan)"],
  ];
  return `
    <div class="bar-list">
      ${rows.map(([label, value, color]) => `
        <div class="bar-row">
          <strong>${label}</strong>
          <div class="bar-track"><span style="--w:${Math.max(2, value / total * 100)}%;background:${color}"></span></div>
          <span class="num">${displayInt(value)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderActionPanel(records) {
  return `
    <section class="panel pad chart-panel">
      <div class="panel-title">
        <div>
          <h3>Tratativas e revisão</h3>
          <p>Controle visual do que já tem ação registrada.</p>
        </div>
        <button class="btn secondary small" data-view="apontamentos" type="button">Abrir apontamentos</button>
      </div>
      ${renderActionSummaryFor(records)}
    </section>
  `;
}

function renderActionSummaryFor(records) {
  const s = stats(records);
  const total = Math.max(1, records.length);
  const rows = [
    ["Revisados", s.reviewed, "var(--green)"],
    ["Com apontamento", s.notes, "var(--cyan)"],
    ["Urgentes", s.urgent, "var(--red)"],
    ["Críticos", s.critical, "var(--orange)"],
  ];
  return `
    <div class="bar-list">
      ${rows.map(([label, value, color]) => `
        <div class="bar-row">
          <strong>${label}</strong>
          <div class="bar-track"><span style="--w:${Math.min(100, value / total * 100)}%;background:${color}"></span></div>
          <span class="num">${displayInt(value)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderNotes() {
  const rows = state.records
    .filter((record) => record.observacao || record.acao || record.responsavel || record.revisado || record.status !== "OK")
    .sort((a, b) => {
      const aHasNote = a.observacao || a.acao || a.responsavel;
      const bHasNote = b.observacao || b.acao || b.responsavel;
      if (!!aHasNote !== !!bHasNote) return aHasNote ? -1 : 1;
      if (a.revisado !== b.revisado) return a.revisado ? 1 : -1;
      return riskScore(b) - riskScore(a);
    });
  return `
    ${renderKpis(rows)}
    <section class="panel pad">
      <div class="panel-title">
        <div>
          <h3>Controle de apontamentos</h3>
          <p>Itens pendentes, revisados ou com tratativa registrada.</p>
        </div>
        <button class="btn secondary small" data-view="inventario" type="button">Voltar para tabela</button>
      </div>
      <div class="table-wrap">${renderTable(rows.slice(0, 200))}</div>
      ${rows.length > 200 ? `<p class="muted" style="margin-bottom:0">Mostrando os 200 primeiros de ${displayInt(rows.length)} apontamentos.</p>` : ""}
    </section>
  `;
}

function renderModal() {
  if (state.modal.type === "import") return renderImportModal();
  if (state.modal.type === "point") return renderPointModal(findRecord(state.modal.id));
  return renderItemModal(state.modal.id ? findRecord(state.modal.id) : null);
}

function renderImportModal() {
  const draft = state.modal;
  if (draft.phase === "map") return renderImportMappingModal(draft);
  return `
    <div class="modal-backdrop" data-close-modal="true">
      <section class="modal import-modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>Importar planilha</h3>
          <button class="btn ghost small" data-close-modal="true" type="button">Fechar</button>
        </div>
        <div class="modal-body">
          <div class="import-drop">
            <div>
              <strong>Selecione uma planilha de inventário</strong>
              <p>O app vai ler os cabeçalhos e permitir mapear cada coluna antes de gravar os dados.</p>
            </div>
            <input id="importFileInput" type="file" accept=".xlsx,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
          </div>
          <div class="import-columns">
            ${importFields.map((field) => `<span>${escapeHtml(field.label)}${field.required ? " *" : ""}</span>`).join("")}
          </div>
          <p class="muted" style="margin-bottom:0">Campos marcados com * são obrigatórios. Os campos numéricos aceitam formato brasileiro, como 1.234,56.</p>
        </div>
      </section>
    </div>
  `;
}

function renderImportMappingModal(draft) {
  const mappedRecords = previewImportedRecords(draft, 6);
  const requiredMissing = importFields.filter((field) => field.required && draft.mapping[field.key] === "__skip__");
  return `
    <div class="modal-backdrop" data-close-modal="true">
      <form class="modal import-modal wide-modal" id="importMappingForm">
        <div class="modal-header">
          <div>
            <h3>Mapear colunas da planilha</h3>
            <p class="muted" style="margin:4px 0 0">${escapeHtml(draft.fileName)} · ${displayInt(draft.rows.length)} linha(s) encontradas</p>
          </div>
          <button class="btn ghost small" data-close-modal="true" type="button">Fechar</button>
        </div>
        <div class="modal-body">
          ${draft.warning ? `<div class="import-alert">${escapeHtml(draft.warning)}</div>` : ""}
          <div class="import-layout">
            <section class="mapping-grid">
              ${importFields.map((field) => `
                <label class="${field.required && draft.mapping[field.key] === "__skip__" ? "missing" : ""}">
                  <span>${escapeHtml(field.label)}${field.required ? " *" : ""}</span>
                  <select name="${field.key}" data-import-map="${field.key}">
                    <option value="__skip__">Não importar</option>
                    ${draft.headers.map((header, index) => `
                      <option value="${index}" ${String(draft.mapping[field.key]) === String(index) ? "selected" : ""}>${escapeHtml(header || `Coluna ${index + 1}`)}</option>
                    `).join("")}
                  </select>
                </label>
              `).join("")}
            </section>
            <aside class="import-options">
              <label>Modo de importação
                <select name="importMode">
                  <option value="append" selected>Adicionar à base atual</option>
                  <option value="replace">Substituir base atual</option>
                </select>
              </label>
              <label>Campos calculados
                <select name="calcMode">
                  <option value="missing" selected>Usar valores da planilha (recalcular só células vazias)</option>
                  <option value="never">Usar somente valores da planilha (sem recalcular)</option>
                  <option value="always">Recalcular tudo a partir do estoque</option>
                </select>
              </label>
              ${renderImportMonthSection(draft)}
              <div class="import-stat">
                <strong>${displayInt(mappedRecords.length)}</strong>
                <span>prévia de itens válidos</span>
              </div>
              ${requiredMissing.length ? `<div class="import-alert error">Mapeie ${requiredMissing.map((field) => field.label).join(", ")} para continuar.</div>` : ""}
            </aside>
          </div>
          <div class="import-preview">
            <div class="panel-title">
              <div>
                <h3>Prévia da importação</h3>
                <p>Mostrando as primeiras linhas conforme o mapeamento atual.</p>
              </div>
            </div>
            ${renderImportPreviewTable(mappedRecords)}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" type="button" id="backToImportButton">Trocar arquivo</button>
          <button class="btn primary" type="submit" ${requiredMissing.length ? "disabled" : ""}>Confirmar importação</button>
        </div>
      </form>
    </div>
  `;
}

// Bloco "Mês de referência" do modal de importação.
// Prioridade: mês detectado da coluna MÊS REFERÊNCIA; campo manual é só fallback.
function renderImportMonthSection(draft) {
  const monthMapped = draft.mapping.mesReferencia !== undefined && draft.mapping.mesReferencia !== "__skip__";
  const detected = monthMapped ? detectImportMonths(draft) : [];

  if (detected.length) {
    return `
      <div class="import-months">
        <span class="import-months-title">Mês de referência — detectado da planilha</span>
        ${detected.map(({ month, count }) => `
          <span class="import-month-chip">${escapeHtml(formatMonth(month))} · ${displayInt(count)} linha(s)</span>
        `).join("")}
      </div>
      <p class="import-hint">${detected.length === 1
        ? "Todas as linhas serão registradas como snapshot deste mês, alimentando o comparativo mensal."
        : "Será registrado um snapshot para cada mês detectado — as linhas entram no mês indicado na própria planilha."}</p>
    `;
  }

  return `
    ${monthMapped ? `<div class="import-alert error">Não reconheci nenhum mês na coluna mapeada em MÊS REFERÊNCIA. Confira a coluna ou informe o mês manualmente abaixo.</div>` : ""}
    <label>Mês de referência (manual)
      <input type="month" name="refMonth" value="${monthKeyToday().slice(0, 7)}" />
    </label>
    <p class="import-hint">Se a planilha tiver coluna de mês (ex.: 04/2026, abril/2026 ou data), mapeie-a em <b>MÊS REFERÊNCIA</b> para detecção automática. Sem coluna, este mês manual é usado no snapshot. Limpe o campo para não registrar.</p>
  `;
}

function renderImportPreviewTable(records) {
  if (!records.length) return `<div class="empty-state">Nenhuma linha válida para pré-visualizar com o mapeamento atual.</div>`;
  const columns = ["partNumber", "saldoNiguri", "invTotal", "comparativo", "percentual", "fornecedor", "material", "cliente", "precoUnitario", "custoDivergencia"];
  const labels = {
    partNumber: "P. Number",
    saldoNiguri: "Saldo",
    invTotal: "Inv. Total",
    comparativo: "Comparativo",
    percentual: "%",
    fornecedor: "Fornecedor",
    material: "Material",
    cliente: "Cliente",
    precoUnitario: "Preço",
    custoDivergencia: "Custo",
  };
  return `
    <div class="table-wrap import-table">
      <table>
        <thead>
          <tr>${columns.map((key) => `<th>${labels[key]}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${records.map((record) => `
            <tr>
              ${columns.map((key) => {
                const value = record[key];
                const text = typeof value === "number"
                  ? (key === "percentual" ? displayPct(value) : key.toLowerCase().includes("custo") || key.toLowerCase().includes("preco") ? displayMoney(value) : displayQty(value))
                  : escapeHtml(value || "-");
                return `<td>${text}</td>`;
              }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderItemModal(record) {
  const isNew = !record;
  const item = record || {
    id: "",
    partNumber: "",
    saldoNiguri: 0,
    stkSbo: 0,
    processo: 0,
    sorocaba: 0,
    resende: 0,
    invTotal: 0,
    comparativo: 0,
    percentual: 0,
    fornecedor: "",
    material: "",
    cliente: "",
    unidade: "",
    precoUnitario: 0,
    custoDivergencia: 0,
    status: "OK",
    attentionTags: [],
    observacao: "",
    acao: "",
    responsavel: "",
    revisado: false,
  };
  return `
    <div class="modal-backdrop" data-close-modal="true">
      <form class="modal" id="itemForm">
        <div class="modal-header">
          <h3>${isNew ? "Novo item de inventário" : `Editar ${escapeHtml(item.partNumber)}`}</h3>
          <button class="btn ghost small" data-close-modal="true" type="button">Fechar</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            ${field("partNumber", "P.Number", item.partNumber, "text")}
            ${field("fornecedor", "Fornecedor", item.fornecedor, "text")}
            ${field("material", "Material", item.material, "text")}
            ${field("cliente", "Cliente", item.cliente, "text")}
            ${field("unidade", "Unidade (SBO/Sorocaba/Resende)", item.unidade, "text")}
            ${field("saldoNiguri", "Saldo Niguri", item.saldoNiguri, "number")}
            ${field("stkSbo", "STK SBO", item.stkSbo, "number")}
            ${field("processo", "Processo", item.processo, "number")}
            ${field("sorocaba", "Sorocaba", item.sorocaba, "number")}
            ${field("resende", "Resende", item.resende, "number")}
            ${field("precoUnitario", "Preço unitário", item.precoUnitario, "number", "0.000001")}
            ${selectField("status", "Status", ["OK", "Atenção", "Crítico", "Urgente"], item.status)}
            <label>Recalcular totais
              <select name="recalc">
                <option value="yes" selected>Sim, usar locais e preço</option>
                <option value="no">Não, manter manual</option>
              </select>
            </label>
            ${field("invTotal", "Inventário total", item.invTotal, "number")}
            ${field("comparativo", "Comparativo", item.comparativo, "number")}
            ${field("percentual", "Percentual decimal", item.percentual, "number", "0.000001")}
            ${field("custoDivergencia", "Custo divergência", item.custoDivergencia, "number", "0.000001")}
            ${field("acao", "Ação / tratativa", item.acao, "text", "", "span-2")}
            ${field("responsavel", "Responsável", item.responsavel, "text", "", "span-2")}
            <label class="wide">Observação
              <textarea name="observacao">${escapeHtml(item.observacao || "")}</textarea>
            </label>
            <label class="span-2">Revisado
              <select name="revisado">
                <option value="false" ${!item.revisado ? "selected" : ""}>Não</option>
                <option value="true" ${item.revisado ? "selected" : ""}>Sim</option>
              </select>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" data-close-modal="true" type="button">Cancelar</button>
          <button class="btn primary" type="submit">Salvar item</button>
        </div>
      </form>
    </div>
  `;
}

function field(name, label, value, type = "text", step = "", extraClass = "") {
  return `
    <label class="${extraClass}">${label}
      <input name="${name}" type="${type}" value="${escapeHtml(value)}" ${step ? `step="${step}"` : ""} />
    </label>
  `;
}

function selectField(name, label, options, selected) {
  return `
    <label>${label}
      <select name="${name}">
        ${options.map((option) => `<option value="${escapeHtml(option)}" ${selected === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderPointModal(record) {
  if (!record) return "";
  return `
    <div class="modal-backdrop" data-close-modal="true">
      <form class="modal narrow" id="pointForm">
        <div class="modal-header">
          <h3>Apontar divergência</h3>
          <button class="btn ghost small" data-close-modal="true" type="button">Fechar</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom:16px">
            <div class="part">${escapeHtml(record.partNumber)}</div>
            <div class="muted">${escapeHtml(record.fornecedor)} · ${escapeHtml(record.material)} · ${escapeHtml(record.cliente)}</div>
          </div>
          <div class="form-grid" style="grid-template-columns:1fr 1fr">
            ${selectField("status", "Status", ["OK", "Atenção", "Crítico", "Urgente"], record.status)}
            ${field("responsavel", "Responsável", record.responsavel || "", "text")}
            ${field("acao", "Ação / tratativa", record.acao || "", "text", "", "wide")}
            <label class="wide">Observação
              <textarea name="observacao">${escapeHtml(record.observacao || "")}</textarea>
            </label>
            <label class="wide">Revisado
              <select name="revisado">
                <option value="false" ${!record.revisado ? "selected" : ""}>Não</option>
                <option value="true" ${record.revisado ? "selected" : ""}>Sim</option>
              </select>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" data-close-modal="true" type="button">Cancelar</button>
          <button class="btn primary" type="submit">Salvar apontamento</button>
        </div>
      </form>
    </div>
  `;
}

async function handleImportFile(file) {
  if (!file) return;
  try {
    showToast("Lendo planilha...");
    const parsed = await parseSpreadsheetFile(file);
    if (!parsed.rows.length) {
      showToast("A planilha não possui linhas para importar", "error");
      return;
    }
    const detected = detectHeader(parsed.rows);
    const headers = detected.headers.map((header, index) => String(header || `Coluna ${index + 1}`).trim());
    const rows = parsed.rows.slice(detected.rowIndex + 1).filter((row) => row.some((cell) => String(cell ?? "").trim()));
    state.modal = {
      type: "import",
      phase: "map",
      fileName: file.name,
      sheetName: parsed.sheetName,
      headerRow: detected.rowIndex,
      headers,
      rows,
      mapping: autoMapHeaders(headers),
      warning: detected.score < 3 ? "Revise o mapeamento: poucos cabeçalhos foram reconhecidos automaticamente." : "",
    };
    render();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Não foi possível ler a planilha", "error");
  }
}

async function parseSpreadsheetFile(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".tsv")) {
    const text = await file.text();
    return { sheetName: file.name, rows: parseDelimitedRows(text, lower.endsWith(".tsv") ? "\t" : "") };
  }
  if (!lower.endsWith(".xlsx")) {
    throw new Error("Use arquivo .xlsx, .csv ou .tsv.");
  }
  const buffer = await file.arrayBuffer();
  return readXlsxRows(buffer);
}

function parseDelimitedRows(text, forcedDelimiter = "") {
  const delimiter = forcedDelimiter || detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((line) => line.some((value) => String(value ?? "").trim()));
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || "";
  const candidates = [";", ",", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

async function readXlsxRows(buffer) {
  const files = await unzipXlsx(buffer);
  const sharedStrings = parseSharedStrings(files.get("xl/sharedStrings.xml") || "");
  const workbook = parseWorkbook(files);
  const sheetXml = files.get(workbook.path) || files.get("xl/worksheets/sheet1.xml");
  if (!sheetXml) throw new Error("Não encontrei a primeira aba da planilha.");
  return {
    sheetName: workbook.name || "Planilha",
    rows: parseWorksheet(sheetXml, sharedStrings),
  };
}

async function unzipXlsx(buffer) {
  if (!("DecompressionStream" in window)) {
    throw new Error("Seu navegador não suporta leitura local de XLSX. Use Edge/Chrome atualizado ou importe CSV.");
  }
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const eocd = findEndOfCentralDirectory(view);
  const entries = new Map();
  let offset = eocd.centralOffset;
  for (let index = 0; index < eocd.totalEntries; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decodeUtf8(bytes.slice(offset + 46, offset + 46 + fileNameLength));
    const normalizedName = name.replace(/\\/g, "/");
    if (normalizedName.endsWith(".xml") || normalizedName.endsWith(".rels")) {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      const content = method === 0 ? compressed : await inflateRaw(compressed, method);
      entries.set(normalizedName, decodeUtf8(content));
    }
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function findEndOfCentralDirectory(view) {
  const min = Math.max(0, view.byteLength - 0x10000 - 22);
  for (let offset = view.byteLength - 22; offset >= min; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return {
        totalEntries: view.getUint16(offset + 10, true),
        centralOffset: view.getUint32(offset + 16, true),
      };
    }
  }
  throw new Error("Arquivo XLSX inválido ou corrompido.");
}

async function inflateRaw(compressed, method) {
  if (method !== 8) throw new Error(`Compactação XLSX não suportada: ${method}`);
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function decodeUtf8(bytes) {
  return new TextDecoder("utf-8").decode(bytes);
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const doc = parseXml(xml);
  return [...doc.getElementsByTagName("si")].map((item) => [...item.getElementsByTagName("t")].map((node) => node.textContent || "").join(""));
}

function parseWorkbook(files) {
  const workbookXml = files.get("xl/workbook.xml") || "";
  const relsXml = files.get("xl/_rels/workbook.xml.rels") || "";
  const workbook = parseXml(workbookXml);
  const rels = parseXml(relsXml);
  const firstSheet = workbook.getElementsByTagName("sheet")[0];
  const relId = firstSheet?.getAttribute("r:id") || firstSheet?.getAttribute("id");
  const name = firstSheet?.getAttribute("name") || "Planilha";
  const relationship = [...rels.getElementsByTagName("Relationship")].find((rel) => rel.getAttribute("Id") === relId);
  const target = relationship?.getAttribute("Target") || "worksheets/sheet1.xml";
  const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`.replace("xl/../", "");
  return { name, path };
}

function parseWorksheet(xml, sharedStrings) {
  const doc = parseXml(xml);
  const rows = [];
  [...doc.getElementsByTagName("row")].forEach((rowNode) => {
    const cells = [];
    let maxColumn = -1;
    [...rowNode.getElementsByTagName("c")].forEach((cellNode) => {
      const ref = cellNode.getAttribute("r") || "";
      const columnIndex = columnLettersToIndex(ref.replace(/\d/g, ""));
      maxColumn = Math.max(maxColumn, columnIndex);
      cells[columnIndex] = readCellValue(cellNode, sharedStrings);
    });
    rows.push(Array.from({ length: maxColumn + 1 }, (_, index) => cells[index] ?? ""));
  });
  return rows;
}

function readCellValue(cellNode, sharedStrings) {
  const type = cellNode.getAttribute("t");
  if (type === "inlineStr") return [...cellNode.getElementsByTagName("t")].map((node) => node.textContent || "").join("");
  const value = cellNode.getElementsByTagName("v")[0]?.textContent || "";
  if (type === "s") return sharedStrings[number(value)] || "";
  if (type === "b") return value === "1" ? "SIM" : "NÃO";
  if (value === "") return "";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function parseXml(xml) {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function columnLettersToIndex(letters) {
  return String(letters || "A").split("").reduce((sum, char) => sum * 26 + char.toUpperCase().charCodeAt(0) - 64, 0) - 1;
}

function detectHeader(rows) {
  const candidates = rows.slice(0, 20).map((row, index) => {
    const score = row.reduce((sum, value) => sum + (matchImportField(value) ? 1 : 0), 0);
    return { index, row, score };
  });
  const best = candidates.sort((a, b) => b.score - a.score)[0] || { index: 0, row: rows[0] || [], score: 0 };
  return {
    rowIndex: best.index,
    headers: best.row,
    score: best.score,
  };
}

function autoMapHeaders(headers) {
  return Object.fromEntries(importFields.map((field) => {
    const index = headers.findIndex((header) => matchImportField(header)?.key === field.key);
    return [field.key, index >= 0 ? String(index) : "__skip__"];
  }));
}

function matchImportField(value) {
  const key = normalizeHeader(value);
  if (!key) return null;
  return importFields.find((field) => field.aliases.map(normalizeHeader).includes(key));
}

function normalizeHeader(value) {
  return normalize(value)
    .replace(/r\$/g, "")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function previewImportedRecords(draft, limit = draft.rows.length, formData = null) {
  return buildImportedRecords(draft, formData, limit).records;
}

function buildImportedRecords(draft, formData = null, limit = Infinity) {
  const mapping = formData
    ? Object.fromEntries(importFields.map((field) => [field.key, formData.get(field.key) || "__skip__"]))
    : draft.mapping;
  const calcMode = formData?.get("calcMode") || "missing";
  const records = [];
  let skipped = 0;
  for (let index = 0; index < draft.rows.length && records.length < limit; index += 1) {
    const row = draft.rows[index];
    const record = recordFromMappedRow(row, mapping, `${draft.fileName}-${index}`, index + draft.headerRow + 2, calcMode);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}

function recordFromMappedRow(row, mapping, importId, rowNumber, calcMode = "missing") {
  const getValue = (key) => {
    const mapped = mapping[key];
    if (mapped === undefined || mapped === "__skip__") return "";
    return row[number(mapped)] ?? "";
  };
  const partNumber = String(getValue("partNumber") || "").trim();
  if (!partNumber) return null;
  let record = {
    id: crypto.randomUUID(),
    rowNumber,
    partNumber,
    saldoNiguri: parseImportNumber(getValue("saldoNiguri")),
    stkSbo: parseImportNumber(getValue("stkSbo")),
    processo: parseImportNumber(getValue("processo")),
    sorocaba: parseImportNumber(getValue("sorocaba")),
    resende: parseImportNumber(getValue("resende")),
    invTotal: parseImportNumber(getValue("invTotal")),
    comparativo: parseImportNumber(getValue("comparativo")),
    percentual: parseImportNumber(getValue("percentual"), true),
    fornecedor: String(getValue("fornecedor") || "").trim(),
    material: String(getValue("material") || "").trim(),
    cliente: String(getValue("cliente") || "").trim(),
    unidade: String(getValue("unidade") || "").trim(),
    precoUnitario: parseImportNumber(getValue("precoUnitario")),
    custoDivergencia: parseImportNumber(getValue("custoDivergencia")),
    mesReferencia: parseMonthReference(getValue("mesReferencia")),
    status: "OK",
    attentionTags: [],
    observacao: "",
    acao: "",
    responsavel: "",
    revisado: false,
  };
  const shouldRecalc = (key) => calcMode === "always" || (calcMode === "missing" && (mapping[key] === "__skip__" || isBlankImportValue(getValue(key))));
  if (shouldRecalc("invTotal")) record.invTotal = number(record.stkSbo) + number(record.processo) + number(record.sorocaba) + number(record.resende);
  if (shouldRecalc("comparativo")) record.comparativo = number(record.invTotal) - number(record.saldoNiguri);
  if (shouldRecalc("percentual")) record.percentual = number(record.saldoNiguri) ? number(record.comparativo) / number(record.saldoNiguri) : 0;
  if (shouldRecalc("custoDivergencia")) record.custoDivergencia = number(record.comparativo) * number(record.precoUnitario);
  record.status = autoStatus(record);
  record.attentionTags = makeTags(record);
  return record;
}

// ============================================================
// Mês de referência detectado da planilha
// ============================================================

const MONTH_NAMES_PT = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

// Converte o valor de uma célula em chave de mês "YYYY-MM-01".
// Aceita: serial de data do Excel, 2026-04, 04/2026, 01/04/2026, 202604,
// número 1-12 (ano atual), "abril", "abr/26", "abril de 2026".
function parseMonthReference(value) {
  if (value === undefined || value === null) return "";
  const mk = (y, m) => (m >= 1 && m <= 12 && y >= 2000 && y <= 2099)
    ? `${y}-${String(m).padStart(2, "0")}-01`
    : "";

  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value) && value >= 1 && value <= 12) {
      return mk(new Date().getFullYear(), value);
    }
    if (/^20\d{2}(0[1-9]|1[0-2])$/.test(String(value))) {
      return mk(Math.floor(value / 100), value % 100);
    }
    // Serial de data do Excel (dias desde 30/12/1899)
    if (value > 20000 && value < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
      return mk(d.getUTCFullYear(), d.getUTCMonth() + 1);
    }
    return "";
  }

  const text = normalize(value).trim();
  if (!text) return "";
  let m;
  if ((m = text.match(/^(20\d{2})[-\/\.](\d{1,2})(?:[-\/\.]\d{1,2})?$/))) return mk(+m[1], +m[2]);   // 2026-04, 2026/04/01
  if ((m = text.match(/^(\d{1,2})[-\/\.](20\d{2})$/))) return mk(+m[2], +m[1]);                      // 04/2026
  if ((m = text.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](20\d{2})$/))) return mk(+m[3], +m[2]);      // 01/04/2026 (dd/mm/aaaa)
  if ((m = text.match(/^(20\d{2})(0[1-9]|1[0-2])$/))) return mk(+m[1], +m[2]);                       // 202604
  if ((m = text.match(/^([a-z]{3,9})\.?(?:\s*(?:de\s+)?[\/\-\s]?\s*(\d{2,4}))?$/)) && MONTH_NAMES_PT[m[1]]) {
    let year = m[2] ? Number(m[2]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    return mk(year, MONTH_NAMES_PT[m[1]]);                                                           // abril, abr/26, abril de 2026
  }
  return "";
}

// Meses distintos encontrados na coluna mapeada como MÊS REFERÊNCIA
function detectImportMonths(draft, mapping = draft.mapping) {
  const col = mapping.mesReferencia;
  if (col === undefined || col === "__skip__") return [];
  const counts = new Map();
  draft.rows.forEach((row) => {
    const key = parseMonthReference(row[number(col)]);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));
}

function isBlankImportValue(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function parseImportNumber(value, isPercent = false) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let text = String(value ?? "").trim();
  if (!text) return 0;
  const hasPercentSymbol = text.includes("%");
  const isNegativeAccounting = /^\(.*\)$/.test(text);
  text = text
    .replace(/R\$/gi, "")
    .replace(/%/g, "")
    .replace(/\u00a0/g, "")
    .replace(/\s/g, "")
    .replace(/[()]/g, "")
    .replace(/[−–—]/g, "-");
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    text = lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (lastComma > -1) {
    text = text.replace(/\./g, "").replace(",", ".");
  }
  let parsed = Number(text);
  if (!Number.isFinite(parsed)) return 0;
  if (isNegativeAccounting) parsed = -Math.abs(parsed);
  return isPercent && hasPercentSymbol ? parsed / 100 : parsed;
}

async function applyImport(form) {
  const draft = state.modal;
  const data = new FormData(form);
  const result = buildImportedRecords(draft, data);
  if (!result.records.length) {
    showToast("Nenhuma linha válida para importar", "error");
    return;
  }
  const mode = data.get("importMode");
  const refMonthValue = String(data.get("refMonth") || "").trim(); // "YYYY-MM"
  state.records = mode === "replace" ? result.records : [...result.records, ...state.records];
  state.page = 1;
  state.modal = null;
  render();
  showToast(`${displayInt(result.records.length)} item(ns) importados — sincronizando...`);
  try {
    await persistBatch(state.records);
    showToast(`${displayInt(result.records.length)} item(ns) importados`);
  } catch (err) {
    console.error("Supabase import:", err);
    showToast("Erro ao sincronizar importação", "error");
    return;
  }
  // Snapshot mensal: prioridade para o mês detectado por linha na planilha;
  // sem coluna de mês, cai no mês manual informado no modal.
  const monthGroups = new Map();
  result.records.forEach((r) => {
    if (!r.mesReferencia) return;
    if (!monthGroups.has(r.mesReferencia)) monthGroups.set(r.mesReferencia, []);
    monthGroups.get(r.mesReferencia).push(r);
  });
  if (monthGroups.size) {
    await saveImportSnapshots(monthGroups);
  } else if (/^\d{4}-\d{2}$/.test(refMonthValue)) {
    await saveImportSnapshots(new Map([[`${refMonthValue}-01`, result.records]]));
  }
}

// Registra a planilha importada como snapshot dos meses informados (escopo TODAS),
// para o comparativo mensal e o seletor de período.
async function saveImportSnapshots(groups) {
  const months = [...groups.keys()].sort();
  const failed = [];
  for (const month of months) {
    const payload = buildSnapshotPayload(groups.get(month), month, "TODAS");
    const { error } = await db
      .from("inventory_snapshots")
      .upsert(payload, { onConflict: "user_id,reference_month,unidade" });
    if (error) {
      console.error("Snapshot da importação:", error);
      failed.push(month);
    }
  }
  await loadSnapshots();
  render();
  if (failed.length) {
    showToast(`Itens importados, mas falhou o snapshot de: ${failed.map(formatMonthName).join(", ")}`, "error");
  } else {
    showToast(months.length === 1
      ? `Inventário registrado como ${formatMonth(months[0])}`
      : `${months.length} meses registrados no comparativo mensal`);
  }
}

function findRecord(id) {
  return state.records.find((record) => record.id === id);
}

function gatherItem(form, existing) {
  const data = new FormData(form);
  let record = {
    ...(existing || {}),
    id: existing?.id || crypto.randomUUID(),
    rowNumber: existing?.rowNumber || "manual",
    partNumber: String(data.get("partNumber") || "").trim(),
    fornecedor: String(data.get("fornecedor") || "").trim(),
    material: String(data.get("material") || "").trim(),
    cliente: String(data.get("cliente") || "").trim(),
    unidade: String(data.get("unidade") || "").trim(),
    saldoNiguri: number(data.get("saldoNiguri")),
    stkSbo: number(data.get("stkSbo")),
    processo: number(data.get("processo")),
    sorocaba: number(data.get("sorocaba")),
    resende: number(data.get("resende")),
    invTotal: number(data.get("invTotal")),
    comparativo: number(data.get("comparativo")),
    percentual: number(data.get("percentual")),
    precoUnitario: number(data.get("precoUnitario")),
    custoDivergencia: number(data.get("custoDivergencia")),
    status: String(data.get("status") || "OK"),
    acao: String(data.get("acao") || "").trim(),
    responsavel: String(data.get("responsavel") || "").trim(),
    observacao: String(data.get("observacao") || "").trim(),
    revisado: data.get("revisado") === "true",
  };
  if (data.get("recalc") === "yes") {
    record = calcFields(record);
    record.status = autoStatus(record);
  }
  record.attentionTags = makeTags(record);
  return record;
}

async function saveItem(form) {
  const existing = state.modal.id ? findRecord(state.modal.id) : null;
  const record = gatherItem(form, existing);
  if (!record.partNumber) {
    showToast("Informe o P.Number", "error");
    return;
  }
  if (existing) {
    state.records = state.records.map((item) => item.id === record.id ? record : item);
    showToast("Item atualizado");
  } else {
    state.records = [record, ...state.records];
    showToast("Item criado");
  }
  state.modal = null;
  render();
  persistUpsert(record);
}

async function savePoint(form) {
  const record = findRecord(state.modal.id);
  if (!record) return;
  const data = new FormData(form);
  record.status = String(data.get("status") || record.status);
  record.acao = String(data.get("acao") || "").trim();
  record.responsavel = String(data.get("responsavel") || "").trim();
  record.observacao = String(data.get("observacao") || "").trim();
  record.revisado = data.get("revisado") === "true";
  record.attentionTags = makeTags(record);
  state.modal = null;
  showToast("Apontamento salvo");
  render();
  persistUpsert(record);
}

async function deleteRecord(id) {
  const record = findRecord(id);
  if (!record) return;
  if (!window.confirm(`Excluir ${record.partNumber}?`)) return;
  state.records = state.records.filter((item) => item.id !== id);
  showToast("Item excluído");
  render();
  persistDelete(id);
}

function exportCsv() {
  const rows = filteredRecords();
  const headers = [
    "P.NUMBER", "UNIDADE", "SALDO NIGURI", "STK SBO", "PROCESSO", "SOROCABA", "RESENDE", "INV.TOTAL",
    "COMPARATIVO", "%", "FORNECEDOR", "MATERIAL", "CLIENTE", "PRECO UNITARIO", "CUSTO DIVERGENCIA",
    "STATUS", "ACAO", "RESPONSAVEL", "OBSERVACAO", "REVISADO",
  ];
  const body = rows.map((r) => [
    r.partNumber, r.unidade, r.saldoNiguri, r.stkSbo, r.processo, r.sorocaba, r.resende, r.invTotal,
    r.comparativo, r.percentual, r.fornecedor, r.material, r.cliente, r.precoUnitario, r.custoDivergencia,
    r.status, r.acao, r.responsavel, r.observacao, r.revisado ? "SIM" : "NAO",
  ]);
  downloadText("inventario-mapeado.csv", "\uFEFF" + [headers, ...body].map((row) => row.map(csvCell).join(";")).join("\r\n"), "text/csv;charset=utf-8");
  showToast(`${displayInt(rows.length)} linhas exportadas`);
}

function csvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function exportJson() {
  downloadText("inventario-mapeado.json", JSON.stringify({
    exportedAt: new Date().toISOString(),
    source: seed.sourceFile,
    records: state.records,
  }, null, 2), "application/json;charset=utf-8");
  showToast("JSON exportado");
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function resetSeed() {
  if (!window.confirm("Restaurar a base original da planilha e apagar TODOS os registros do servidor?")) return;
  state.records = prepareRecords(clone(seed.records || []));
  state.page = 1;
  render();
  showToast("Restaurando base — sincronizando...");
  try {
    await persistBatch(state.records);
    showToast("Base original restaurada");
  } catch (err) {
    console.error("Supabase resetSeed:", err);
    showToast("Erro ao sincronizar restauração", "error");
  }
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelector("#newItemButton")?.addEventListener("click", () => {
    state.modal = { type: "item" };
    render();
  });
  document.querySelector("#importSheetButton")?.addEventListener("click", () => {
    state.modal = { type: "import", phase: "upload" };
    render();
  });
  document.querySelector("#exportCsvButton")?.addEventListener("click", exportCsv);
  document.querySelector("#exportJsonButton")?.addEventListener("click", exportJson);
  document.querySelector("#logoutButton")?.addEventListener("click", logout);
  document.querySelector("#resetSeedButton")?.addEventListener("click", resetSeed);
  document.querySelector("#clearFiltersButton")?.addEventListener("click", clearFilters);
  document.querySelector("#clientQuickAll")?.addEventListener("click", () => setFilter("cliente", "all"));
  document.querySelector("#clientQuickClear")?.addEventListener("click", clearFilters);
  document.querySelectorAll("[data-client-chip]").forEach((button) => {
    button.addEventListener("click", () => setFilter("cliente", button.dataset.clientChip));
  });

  document.querySelectorAll("[data-periodo-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.periodo = btn.dataset.periodoMode;
      state.periodoMeses = [];
      state.page = 1;
      render();
    });
  });
  document.querySelectorAll("[data-periodo-mes]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mes = btn.dataset.periodoMes;
      const set = new Set(state.periodoMeses || []);
      if (set.has(mes)) set.delete(mes);
      else set.add(mes);
      state.periodoMeses = [...set].sort();
      state.page = 1;
      render();
    });
  });
  document.querySelectorAll("[data-periodo-ano]").forEach((sel) => {
    sel.addEventListener("change", (event) => {
      state.periodoAno = number(event.target.value) || new Date().getFullYear();
      render();
    });
  });
  document.querySelectorAll("[data-periodo-mes-select]").forEach((sel) => {
    sel.addEventListener("change", (event) => {
      const mesNum = number(event.target.value);
      if (!mesNum) return;
      const ano = state.periodoAno || new Date().getFullYear();
      const key = `${ano}-${String(mesNum).padStart(2, "0")}-01`;
      const set = new Set(state.periodoMeses || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      state.periodoMeses = [...set].sort();
      state.page = 1;
      render();
    });
  });
  document.querySelectorAll("[data-periodo-clear]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.periodoMeses = [];
      state.page = 1;
      render();
    });
  });

  // Filtro e ordenação da tabela de divergências mensais
  document.querySelector("#monthlyFilterInput")?.addEventListener("input", (event) => {
    state.monthlyFilter = event.target.value;
    render();
    window.requestAnimationFrame(() => {
      const input = document.querySelector("#monthlyFilterInput");
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  });
  document.querySelector("#monthlySortSelect")?.addEventListener("change", (event) => {
    state.monthlySort = event.target.value;
    render();
  });
  document.querySelector("#monthlySortDirButton")?.addEventListener("click", () => {
    state.monthlySortDir = state.monthlySortDir === "asc" ? "desc" : "asc";
    render();
  });

  document.querySelector("#topFilter")?.addEventListener("change", (event) => {
    state.topN = number(event.target.value);
    render();
  });

  document.querySelector("#prevPageButton")?.addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    render();
  });
  document.querySelector("#nextPageButton")?.addEventListener("click", () => {
    state.page += 1;
    render();
  });

  const filterMap = {
    queryFilter: "query",
    statusFilter: "status",
    movementFilter: "movimento",
    supplierFilter: "fornecedor",
    materialFilter: "material",
    clientFilter: "cliente",
  };
  Object.entries(filterMap).forEach(([id, key]) => {
    document.querySelector(`#${id}`)?.addEventListener(id === "queryFilter" ? "input" : "change", (event) => setFilter(key, event.target.value));
  });

  document.querySelector("#sortBy")?.addEventListener("change", (event) => {
    state.sortBy = event.target.value;
    state.page = 1;
    render();
  });
  document.querySelector("#toggleSortButton")?.addEventListener("click", () => {
    state.sortDir = state.sortDir === "desc" ? "asc" : "desc";
    state.page = 1;
    render();
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const { action, id, pn } = button.dataset;
      // Visões por período usam registros agregados com id sintético —
      // resolve para o registro vivo pelo part number antes de editar/apontar/excluir.
      const target = findRecord(id) || (pn && state.records.find((r) => normalize(r.partNumber) === normalize(pn)));
      if (!target) {
        showToast("Item histórico do período — edição/exclusão valem no inventário atual", "error");
        return;
      }
      if (action === "delete") return deleteRecord(target.id);
      if (action === "edit" || action === "point") {
        state.modal = { type: action === "edit" ? "item" : "point", id: target.id };
      }
      render();
    });
  });

  document.querySelector(".modal-backdrop")?.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) {
      state.modal = null;
      render();
    }
  });
  document.querySelectorAll("button[data-close-modal]").forEach((target) => {
    target.addEventListener("click", () => {
      state.modal = null;
      render();
    });
  });

  document.querySelector("#itemForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveItem(event.currentTarget);
  });
  document.querySelector("#pointForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    savePoint(event.currentTarget);
  });
  document.querySelector("#importFileInput")?.addEventListener("change", (event) => {
    handleImportFile(event.target.files?.[0]);
  });
  document.querySelectorAll("[data-import-map]").forEach((select) => {
    select.addEventListener("change", (event) => {
      if (state.modal?.type !== "import") return;
      state.modal.mapping[event.target.dataset.importMap] = event.target.value;
      render();
    });
  });
  document.querySelector("#backToImportButton")?.addEventListener("click", () => {
    state.modal = { type: "import", phase: "upload" };
    render();
  });
  document.querySelector("#importMappingForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    applyImport(event.currentTarget);
  });

  // Análise PCP
  document.querySelectorAll("[data-analise-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.analiseTab = btn.dataset.analiseTab;
      render();
    });
  });
  document.querySelectorAll("[data-analise-top]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.analiseTop;
      state.analiseTop = val === "all" ? "all" : Number(val);
      render();
    });
  });
  document.querySelectorAll("[data-analise-planta]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.analisePlanta = btn.dataset.analisePlanta;
      render();
    });
  });
  document.querySelector("#saveSnapshotButton")?.addEventListener("click", saveSnapshot);
  document.querySelector("#autoClassifyButton")?.addEventListener("click", autoClassifyPlants);

  // Drawer: clique em qualquer elemento com data-drill="field:value"
  document.querySelectorAll("[data-drill]").forEach((el) => {
    el.addEventListener("click", (event) => {
      // Ignora se clique foi em botão filho (ex: "Filtrar")
      if (event.target.closest("button[data-drill-skip]")) return;
      const [field, ...rest] = el.dataset.drill.split(":");
      const value = rest.join(":");
      if (!field || !value) return;
      openDrawer(field, value);
    });
  });

  // Drawer: fechar
  document.querySelectorAll("[data-close-drawer]").forEach((el) => {
    el.addEventListener("click", closeDrawer);
  });
  document.querySelector("#drawerOpenInListButton")?.addEventListener("click", openDrawerInList);
  document.querySelectorAll("[data-delete-snapshot]").forEach((btn) => {
    btn.addEventListener("click", () => deleteSnapshot(btn.dataset.deleteSnapshot));
  });
}

// ============================================================
// Autenticação e inicialização
// ============================================================

function showLoginOverlay(visible) {
  const overlay = document.querySelector("#loginOverlay");
  if (overlay) overlay.classList.toggle("hidden", !visible);
}

async function logout() {
  await db.auth.signOut();
  state.records = [];
  state.user = null;
  state.loading = false;
  app.innerHTML = "";
  showLoginOverlay(true);
}

async function loadAndRender() {
  state.loading = true;
  render();
  try {
    const [records] = await Promise.all([loadFromSupabase(), loadSnapshots()]);
    state.records = records;
  } catch (err) {
    console.error("Erro ao carregar do Supabase:", err);
    showToast("Erro ao carregar dados do servidor", "error");
    state.records = [];
  } finally {
    state.loading = false;
    render();
  }
}

async function initAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    state.user = session.user;
    showLoginOverlay(false);
    await loadAndRender();
  } else {
    state.loading = false;
    showLoginOverlay(true);
    app.innerHTML = "";
  }

  db.auth.onAuthStateChange(async (event, session) => {
    // SIGNED_IN é re-disparado em refresh de token / volta de aba.
    // Só recarrega dados se for um login NOVO (usuário diferente do atual).
    if (event === "SIGNED_IN" && session) {
      if (state.user && state.user.id === session.user.id) {
        // Mesmo usuário — apenas atualiza referência da sessão, sem recarregar
        state.user = session.user;
        return;
      }
      state.user = session.user;
      showLoginOverlay(false);
      await loadAndRender();
    } else if (event === "SIGNED_OUT") {
      state.records = [];
      state.user = null;
      state.loading = false;
      app.innerHTML = "";
      showLoginOverlay(true);
    }
    // Ignora TOKEN_REFRESHED, USER_UPDATED, INITIAL_SESSION etc.
  });

  document.querySelector("#loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value;
    const errorEl = document.querySelector("#loginError");
    const submitBtn = document.querySelector("#loginSubmit");

    errorEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Entrando...";

    const { error } = await db.auth.signInWithPassword({ email, password });

    submitBtn.disabled = false;
    submitBtn.textContent = "Entrar";

    if (error) {
      errorEl.textContent = error.message === "Invalid login credentials"
        ? "Email ou senha incorretos."
        : error.message;
    }
  });
}

// Fechar drawer com tecla Esc
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.drawer) closeDrawer();
});

initAuth();
