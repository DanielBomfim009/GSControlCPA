const APP_VERSION = "2026.07.gs-control-cpa.admin.v1";
const STORAGE_KEY = "gs-control-cpa-admin-local-v1";
const UI_KEY = "gs-control-cpa-admin-ui-v1";

const ui = {
  section: "admin",
  adminTab: "visao-geral",
  range: "mes",
  search: "",
  sidebarCollapsed: false,
};

const adminTabs = [
  { id: "visao-geral", label: "Visao geral" },
  { id: "minha-operacao", label: "Minha operacao" },
  { id: "metas-fechamento", label: "Metas & Fechamento" },
  { id: "metodos", label: "Metodos" },
  { id: "ranking", label: "Ranking" },
  { id: "lixeira", label: "Lixeira" },
];

let data = null;

const content = document.querySelector("#app-content");
const titleNode = document.querySelector("#page-title");
const descriptionNode = document.querySelector("#page-description");
const breadcrumbNode = document.querySelector("#breadcrumb");
const actionsNode = document.querySelector("#section-actions");
const searchNode = document.querySelector("#global-search");
const toastRegion = document.querySelector("#toast-region");

async function init() {
  hydrateUi();
  await loadData();
  bindStaticEvents();
  paintStaticIcons();
  render();
  registerServiceWorker();
}

function hydrateUi() {
  try {
    Object.assign(ui, JSON.parse(localStorage.getItem(UI_KEY) || "{}"));
  } catch {
    // noop
  }
}

function persistUi() {
  localStorage.setItem(UI_KEY, JSON.stringify(ui));
}

async function loadData() {
  const persisted = localStorage.getItem(STORAGE_KEY);
  if (persisted) {
    try {
      const parsed = JSON.parse(persisted);
      if (parsed.version === APP_VERSION) {
        data = parsed;
        return;
      }
    } catch {
      // noop
    }
  }

  const response = await fetch("data/seed.json");
  const seed = await response.json();
  data = normalizeData(seed);
  persistData();
}

function normalizeData(seed) {
  const financial = getFinancialSummaryFrom(seed);
  return {
    ...seed,
    version: APP_VERSION,
    dailyGoal: seed.dailyGoal || 500,
    operations:
      seed.operations ||
      [
        {
          id: "OPM-888",
          title: "Meta 888 SEM34",
          platform: "781WIN",
          network: "888",
          accounts: 20,
          remessas: 0,
          profit: 0,
          progress: 0,
          status: "ativa",
          createdAt: "2026-07-16",
        },
        {
          id: "OPM-777",
          title: "777 - Win",
          platform: "777",
          network: "777",
          accounts: 10,
          remessas: 1,
          profit: 140,
          progress: 100,
          status: "encerrada",
          createdAt: "2026-07-14",
        },
      ],
    profile: {
      ...seed.profile,
      updatedAt: seed.profile?.updatedAt || formatDateTime(new Date()),
    },
    financialSnapshot: {
      totalProfit: financial.profit,
      todayProfit: Math.max(0, financial.todayProfit),
    },
  };
}

function persistData() {
  data.profile.updatedAt = formatDateTime(new Date());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function bindStaticEvents() {
  document.addEventListener("click", handleClick);
  searchNode.addEventListener("input", (event) => {
    ui.search = event.target.value.trim().toLowerCase();
    persistUi();
    render();
  });

  document.querySelector("#import-button").addEventListener("click", () => {
    document.querySelector("#import-input").click();
  });
  document.querySelector("#import-input").addEventListener("change", importJson);
  document.querySelector("#export-button").addEventListener("click", exportJson);
  document.querySelector("#reset-button").addEventListener("click", resetData);
  document.querySelector("#cost-form").addEventListener("submit", submitCost);
  document.querySelector("#remessa-form").addEventListener("submit", submitRemessa);

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchNode.focus();
      searchNode.select();
    }
    if (event.key === "Escape") {
      document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
    }
  });
}

function handleClick(event) {
  const target = event.target.closest("[data-section], [data-admin-tab], [data-range], [data-action], [data-close-dialog]");
  if (!target) return;

  if (target.dataset.section) {
    ui.section = target.dataset.section;
    persistUi();
    render();
    return;
  }

  if (target.dataset.adminTab) {
    ui.adminTab = target.dataset.adminTab;
    persistUi();
    render();
    return;
  }

  if (target.dataset.range) {
    ui.range = target.dataset.range;
    persistUi();
    render();
    return;
  }

  if (target.dataset.closeDialog) {
    closeDialog(target.dataset.closeDialog);
    return;
  }

  if (target.dataset.action) {
    runAction(target.dataset.action);
  }
}

function runAction(action) {
  switch (action) {
    case "go-home":
      ui.section = "admin";
      ui.adminTab = "visao-geral";
      persistUi();
      render();
      break;
    case "toggle-sidebar":
      ui.sidebarCollapsed = !ui.sidebarCollapsed;
      persistUi();
      renderShell();
      break;
    case "cycle-range":
      ui.range = nextRange(ui.range);
      persistUi();
      render();
      break;
    case "refresh":
      persistData();
      showToast("Leitura da operacao atualizada.", "good");
      render();
      break;
    case "new-operation":
      showToast("Na proxima etapa eu monto o fluxo completo da nova meta.", "alert");
      break;
    case "edit-daily-goal":
      showToast("Vou transformar essa acao em edicao real da meta diaria na proxima etapa.", "alert");
      break;
    default:
      break;
  }
}

function render() {
  renderShell();
  content.innerHTML = renderAdmin();
  paintStaticIcons();
  drawOverviewChart();
}

function renderShell() {
  document.body.classList.toggle("sidebar-collapsed", ui.sidebarCollapsed);
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.section === ui.section);
  });

  document.querySelector("#profile-name").textContent = data.profile.owner;
  document.querySelector("#profile-role").textContent = data.profile.role;
  document.querySelector("#sidebar-updated-at").textContent = `Atualizado ${data.profile.updatedAt}`;
  searchNode.value = ui.search;

  const meta = getCurrentMeta();
  breadcrumbNode.textContent = meta.breadcrumb;
  titleNode.textContent = meta.title;
  descriptionNode.textContent = meta.description;
  document.querySelector("#range-label").textContent = labelRange(ui.range);

  actionsNode.innerHTML = `
    <button class="button button--primary" data-action="${meta.action}">
      <span>${meta.actionLabel}</span>
    </button>
  `;

  const collapseText = document.querySelector(".sidebar-collapse__text");
  if (collapseText) collapseText.textContent = ui.sidebarCollapsed ? "Expandir" : "Recolher";
}

function getCurrentMeta() {
  const map = {
    "visao-geral": {
      breadcrumb: "Admin • Visao geral",
      title: "Admin",
      description: "Resumo central da operacao, metas e leitura do momento.",
      actionLabel: "Atualizar agora",
      action: "refresh",
    },
    "minha-operacao": {
      breadcrumb: "Admin • Minha operacao",
      title: "Minha operacao",
      description: "Resumo rapido das metas ativas e encerradas.",
      actionLabel: "Nova meta",
      action: "new-operation",
    },
    "metas-fechamento": {
      breadcrumb: "Admin • Metas & Fechamento",
      title: "Metas & Fechamento",
      description: "Area reservada para o fluxo detalhado de acompanhamento e fechamento.",
      actionLabel: "Atualizar agora",
      action: "refresh",
    },
    metodos: {
      breadcrumb: "Admin • Metodos",
      title: "Metodos",
      description: "Espaco reservado para os metodos realmente necessarios da operacao.",
      actionLabel: "Atualizar agora",
      action: "refresh",
    },
    ranking: {
      breadcrumb: "Admin • Ranking",
      title: "Ranking",
      description: "Aqui entraremos com os rankings mais uteis para sua decisao diaria.",
      actionLabel: "Atualizar agora",
      action: "refresh",
    },
    lixeira: {
      breadcrumb: "Admin • Lixeira",
      title: "Lixeira",
      description: "Historico controlado de itens removidos e futuras restauracoes.",
      actionLabel: "Atualizar agora",
      action: "refresh",
    },
  };

  return map[ui.adminTab] || map["visao-geral"];
}

function renderAdmin() {
  switch (ui.adminTab) {
    case "visao-geral":
      return renderOverview();
    case "minha-operacao":
      return renderMyOperation();
    default:
      return renderPlaceholder();
  }
}

function renderOverview() {
  const financial = getFinancialSummaryFrom(data);
  const totalAccounts = sum(data.networks, "operators");
  const topNetwork = [...data.networks].sort((a, b) => b.profit - a.profit)[0];
  const activeOperators = data.operators.filter((item) => item.status !== "offline").length;
  const goalsInSystem = data.goalsSummary?.total || data.goals.length;
  const dailyGoal = Number(data.dailyGoal || 500);
  const remaining = Math.max(dailyGoal - financial.todayProfit, 0);
  const averagePerGoal = goalsInSystem ? financial.profit / goalsInSystem : 0;
  const averagePerAccount = totalAccounts ? financial.profit / totalAccounts : 0;
  const filtered = getRangeHistory();

  return `
    <section class="admin-tabs">
      ${renderAdminTabs()}
    </section>

    <section class="admin-hero">
      <div>
        <div class="section-kicker">Dados em tempo real</div>
        <h2>Ola, ${escapeHtml(data.profile.owner)}</h2>
        <p>Base principal da sua operacao com leitura de lucro, metas, redes e status do momento.</p>
      </div>
      <div class="admin-hero__chips">
        <span class="tiny-badge tiny-badge--good">Online</span>
        <span class="tiny-badge">${escapeHtml(data.profile.role)}</span>
      </div>
    </section>

    <section class="daily-goal-card">
      <div class="daily-goal-card__copy">
        <div class="section-kicker">Meta do dia</div>
        <strong>${currency(financial.todayProfit)} / ${currency(dailyGoal)}</strong>
        <p>Faltam ${currency(remaining)} para bater sua meta diaria de lucro.</p>
      </div>
      <button class="icon-chip" data-action="edit-daily-goal" aria-label="Editar meta do dia">
        <span data-icon="edit"></span>
      </button>
    </section>

    <section class="split-grid admin-overview-grid">
      <article class="chart-card">
        <div class="section-head">
          <div>
            <div class="section-kicker">Curva de lucro</div>
            <h3>${currency(sum(filtered.profit))}</h3>
            <p>Filtro atual: ${labelRange(ui.range)}</p>
          </div>
          <div class="segmented">
            ${adminRangeOption("mes")}
            ${adminRangeOption("hoje")}
            ${adminRangeOption("ontem")}
            ${adminRangeOption("7d")}
            ${adminRangeOption("30d")}
            ${adminRangeOption("tudo")}
          </div>
        </div>
        <div class="canvas-wrap"><canvas id="dashboard-chart" width="980" height="320"></canvas></div>
      </article>

      <article class="chart-card">
        <div class="section-head">
          <div>
            <div class="section-kicker">Funil da operacao</div>
            <h3>Resumo geral</h3>
            <p>Os blocos abaixo acompanham o filtro selecionado.</p>
          </div>
        </div>
        <div class="funnel-list admin-funnel">
          ${renderFunnelCard("Lucro total na plataforma", currency(financial.profit))}
          ${renderFunnelCard("Lucro do dia", currency(financial.todayProfit))}
          ${renderFunnelCard("Contas no sistema", String(totalAccounts))}
          ${renderFunnelCard("Remessas no sistema", String(data.remessas.length))}
          ${renderFunnelCard("Metas no sistema", String(goalsInSystem))}
        </div>
      </article>
    </section>

    <section class="duo-grid">
      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Top redes</div>
            <h3>Performance das redes</h3>
            <p>As redes com melhor retorno final aparecem primeiro.</p>
          </div>
        </div>
        <div class="signal-list">
          ${[...data.networks]
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 4)
            .map((item) => renderSignalCard(item.name, currency(item.profit), `${item.goalPct}% da meta • ${item.operators} contas`))
            .join("")}
        </div>
      </article>

      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Status atual da cooperacao</div>
            <h3>Saudavel</h3>
            <p>Operacao acelerando - resultado consistente.</p>
          </div>
          <span class="tiny-badge tiny-badge--good">Sem risco</span>
        </div>
        <div class="mini-grid">
          ${renderMiniPanel("Lucro total acumulado", currency(financial.profit), "Base consolidada da operacao")}
          ${renderMiniPanel("Media por meta", currency(averagePerGoal), `${goalsInSystem} metas consideradas`)}
          ${renderMiniPanel("Media por conta", currency(averagePerAccount), `${totalAccounts} contas monitoradas`)}
          ${renderMiniPanel("Risco operacional", "Nenhum", `${activeOperators} operadores ativos`)}
        </div>
      </article>
    </section>

    <section class="duo-grid">
      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Leitura da operacao</div>
            <h3>Resumo executivo</h3>
            <p>Base curta para decisao rapida.</p>
          </div>
        </div>
        <div class="signal-list">
          ${renderSignalCard("Melhor rede", topNetwork.name, `${currency(topNetwork.profit)} de lucro final`)}
          ${renderSignalCard("Previsao media por meta", currency(averagePerGoal), "Referencia para acompanhar o ciclo")}
          ${renderSignalCard("Notificacoes", "Ativar notificacoes", "Mantive essa opcao na estrutura da tela")}
        </div>
      </article>

      <article class="activity-card">
        <div class="section-head">
          <div>
            <div class="section-kicker">Atividade recente</div>
            <h3>Ultimos movimentos</h3>
            <p>Eventos mais recentes da sua base.</p>
          </div>
        </div>
        <div class="activity-list">
          ${data.activity
            .slice(0, 4)
            .map(
              (item) => `
                <div class="activity-item">
                  <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <div class="activity-item__meta">${escapeHtml(item.description)}</div>
                  </div>
                  <span class="activity-item__time">${escapeHtml(item.time)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function renderMyOperation() {
  const financial = getFinancialSummaryFrom(data);
  const activeOperations = filterOperations(data.operations.filter((item) => item.status === "ativa"));
  const closedOperations = filterOperations(data.operations.filter((item) => item.status !== "ativa"));

  return `
    <section class="admin-tabs">
      ${renderAdminTabs()}
    </section>

    <section class="panel operation-summary-card">
      <div class="section-head">
        <div>
          <div class="section-kicker">Centro de operacoes</div>
          <h3>Lucro total da operacao</h3>
          <p>Resumo breve das metas ativas, encerradas e da sua leitura operacional.</p>
        </div>
        <button class="button button--primary" data-action="new-operation">Nova meta</button>
      </div>
      <div class="operation-summary-card__value">${currency(financial.profit)}</div>
      <div class="admin-kpi-grid">
        ${renderKpiRow("Metas ativas", String(data.operations.filter((item) => item.status === "ativa").length), "Em andamento agora")}
        ${renderKpiRow("Encerradas", String(data.operations.filter((item) => item.status !== "ativa").length), "Historico finalizado")}
        ${renderKpiRow("Contas processadas", String(sum(data.operations, "accounts")), "Base total acompanhada")}
        ${renderKpiRow("Remessas", String(sum(data.operations, "remessas")), "Movimentos registrados")}
        ${renderKpiRow("Taxa de acerto", `${data.operations.length ? Math.round((closedOperations.length / data.operations.length) * 100) : 0}%`, "Leitura inicial")}
        ${renderKpiRow("ROI medio", `${Math.round(average(data.operators, "roi"))}%`, "Media atual da equipe")}
      </div>
    </section>

    <section class="duo-grid">
      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Operacoes ativas</div>
            <h3>${activeOperations.length} meta(s) em andamento</h3>
            <p>Estrutura pronta para abrirmos cada meta individualmente nas proximas etapas.</p>
          </div>
        </div>
        <div class="operation-card-grid">
          ${activeOperations
            .map(
              (item) => `
                <article class="operation-card">
                  <div class="operation-card__head">
                    <span class="tiny-badge tiny-badge--good">Em andamento</span>
                    <strong>${escapeHtml(item.network)}</strong>
                  </div>
                  <h4>${escapeHtml(item.title)}</h4>
                  <p>${escapeHtml(item.platform)} • ${item.accounts} contas</p>
                  <div class="operation-card__stats">
                    <span>Remessas ${item.remessas}</span>
                    <span>Lucro ${currency(item.profit)}</span>
                  </div>
                  <div class="progress"><span style="width:${item.progress}%"></span></div>
                  <div class="operation-card__footer">
                    <span>Progresso ${item.progress}%</span>
                    <button class="button button--ghost" type="button">Abrir operacao</button>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Operacoes encerradas</div>
            <h3>${closedOperations.length} meta(s) finalizadas</h3>
            <p>Historico resumido para comparacao de resultado final.</p>
          </div>
        </div>
        <div class="activity-list">
          ${closedOperations
            .map(
              (item) => `
                <div class="activity-item">
                  <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <div class="activity-item__meta">${escapeHtml(item.platform)} • ${item.accounts} contas • ${formatDisplayDate(item.createdAt)}</div>
                  </div>
                  <span class="money-green">${currency(item.profit)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function renderPlaceholder() {
  const meta = getCurrentMeta();
  return `
    <section class="admin-tabs">
      ${renderAdminTabs()}
    </section>
    <section class="panel admin-placeholder">
      <div class="section-kicker">Estrutura pronta</div>
      <h3>${escapeHtml(meta.title)}</h3>
      <p>${escapeHtml(meta.description)}</p>
    </section>
  `;
}

function renderAdminTabs() {
  return adminTabs
    .map(
      (tab) => `
        <button class="admin-tab ${ui.adminTab === tab.id ? "is-active" : ""}" data-admin-tab="${tab.id}">
          ${escapeHtml(tab.label)}
        </button>
      `
    )
    .join("");
}

function adminRangeOption(value) {
  return `<button class="${ui.range === value ? "is-active" : ""}" data-range="${value}">${labelRange(value)}</button>`;
}

function renderFunnelCard(label, value) {
  return `
    <div class="admin-funnel__card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderSignalCard(label, value, note) {
  return `
    <div class="signal-card">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
      <small>${escapeHtml(note)}</small>
    </div>
  `;
}

function renderMiniPanel(label, value, note) {
  return `
    <div class="mini-panel">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(note)}</span>
    </div>
  `;
}

function renderKpiRow(label, value, note) {
  return `
    <div class="kpi-row">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(note)}</span>
    </div>
  `;
}

function filterOperations(items) {
  if (!ui.search) return items;
  return items.filter((item) =>
    [item.title, item.platform, item.network, item.id].some((field) => String(field).toLowerCase().includes(ui.search))
  );
}

function drawOverviewChart() {
  const canvas = document.querySelector("#dashboard-chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const history = getRangeHistory();
  const width = canvas.width;
  const height = canvas.height;
  const padding = 28;
  const values = history.profit.length ? history.profit : [0];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0f131a";
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(255,59,48,0.32)");
  gradient.addColorStop(1, "rgba(255,59,48,0)");

  const points = values.map((value, index) => {
    const x = padding + stepX * index;
    const y = height - padding - ((value - min) / span) * (height - padding * 2);
    return { x, y, value };
  });

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = "#ff4438";
  ctx.lineWidth = 3;
  ctx.shadowBlur = 16;
  ctx.shadowColor = "rgba(255,68,56,0.55)";
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.lineTo(points.at(-1).x, height - padding);
  ctx.lineTo(points[0].x, height - padding);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.fillStyle = "#7d8597";
  ctx.font = "12px Inter";
  history.labels.forEach((label, index) => {
    const x = padding + stepX * index;
    ctx.fillText(label, x - 10, height - 8);
  });
}

function getRangeHistory() {
  const source = data.history || { labels: [], profit: [], revenue: [], costs: [] };
  const map = {
    hoje: 1,
    ontem: 1,
    "7d": 7,
    "30d": source.labels.length,
    mes: source.labels.length,
    tudo: source.labels.length,
  };
  const size = map[ui.range] || source.labels.length;
  const start =
    ui.range === "ontem"
      ? Math.max(0, source.labels.length - 2)
      : Math.max(0, source.labels.length - size);
  const end = ui.range === "ontem" ? Math.max(start + 1, source.labels.length - 1) : source.labels.length;

  return {
    labels: source.labels.slice(start, end),
    profit: source.profit.slice(start, end),
    revenue: source.revenue.slice(start, end),
    costs: source.costs.slice(start, end),
  };
}

function getFinancialSummaryFrom(source) {
  const revenue = sum(source.remessas || [], "value");
  const costs = sum(source.costs || [], "value");
  const profit = Math.max(0, revenue - costs);
  const todayProfit = sum((source.remessas || []).filter((item) => item.date === today()), "value");
  return { revenue, costs, profit, todayProfit };
}

function nextRange(value) {
  return {
    mes: "hoje",
    hoje: "ontem",
    ontem: "7d",
    "7d": "30d",
    "30d": "tudo",
    tudo: "mes",
  }[value] || "mes";
}

function labelRange(value) {
  return {
    mes: "Mes",
    hoje: "Hoje",
    ontem: "Ontem",
    "7d": "7d",
    "30d": "30d",
    tudo: "Tudo",
  }[value] || "Mes";
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  file
    .text()
    .then((text) => {
      const parsed = JSON.parse(text);
      data = normalizeData(parsed);
      persistData();
      showToast("Base importada com sucesso.", "good");
      render();
    })
    .catch(() => showToast("Nao foi possivel importar esse arquivo.", "danger"))
    .finally(() => {
      event.target.value = "";
    });
}

async function resetData() {
  const response = await fetch("data/seed.json");
  data = normalizeData(await response.json());
  persistData();
  showToast("Base restaurada para o modelo inicial.", "alert");
  render();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "gs-control-cpa-admin.json";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Base exportada em JSON.", "good");
}

function submitCost(event) {
  event.preventDefault();
  showToast("O fluxo real de custo vai entrar quando abrirmos essa aba.", "alert");
  closeDialog("cost-dialog");
}

function submitRemessa(event) {
  event.preventDefault();
  showToast("O cadastro completo da nova meta sera a proxima etapa.", "alert");
  closeDialog("remessa-dialog");
}

function openDialog(id) {
  document.querySelector(`#${id}`)?.showModal();
}

function closeDialog(id) {
  document.querySelector(`#${id}`)?.close();
}

function showToast(message, tone = "good") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${tone}`;
  toast.textContent = message;
  toastRegion.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function sum(items, key) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, item) => acc + Number(key ? item[key] || 0 : item || 0), 0);
}

function average(items, key) {
  return items.length ? sum(items, key) / items.length : 0;
}

function currency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDisplayDate(value) {
  if (!value) return "—";
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : String(value);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function today() {
  return "2026-07-16";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function paintStaticIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    const name = node.dataset.icon;
    node.innerHTML = iconMarkup(name);
  });
}

function iconMarkup(name) {
  const paths = {
    dashboard: `<rect x="3" y="3" width="8" height="8" rx="1"></rect><rect x="13" y="3" width="8" height="5" rx="1"></rect><rect x="13" y="10" width="8" height="11" rx="1"></rect><rect x="3" y="13" width="8" height="8" rx="1"></rect>`,
    search: `<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>`,
    globe: `<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a15 15 0 0 1 0 18"></path><path d="M12 3a15 15 0 0 0 0 18"></path>`,
    message: `<path d="M4 6h16v10H8l-4 4V6z"></path>`,
    bell: `<path d="M6 8a6 6 0 1 1 12 0c0 7 3 6 3 8H3c0-2 3-1 3-8"></path><path d="M10 20a2 2 0 0 0 4 0"></path>`,
    moon: `<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"></path>`,
    "chevrons-left": `<path d="m11 17-5-5 5-5"></path><path d="m18 17-5-5 5-5"></path>`,
    calendar: `<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4"></path><path d="M8 3v4"></path><path d="M3 11h18"></path>`,
    edit: `<path d="M12 20h9"></path><path d="m16.5 3.5 4 4L7 21l-4 1 1-4Z"></path>`,
  };

  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.dashboard}</svg>`;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("sw.js");
  } catch {
    // noop
  }
}

init();
