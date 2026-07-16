const APP_VERSION = "2026.07.gs-control-cpa.admin.v2";
const STORAGE_KEY = "gs-control-cpa-admin-local-v2";
const UI_KEY = "gs-control-cpa-admin-ui-v2";
const TODAY = "2026-07-16";

const ui = {
  section: "admin",
  adminTab: "visao-geral",
  range: "mes",
  search: "",
  sidebarCollapsed: false,
  currentOperationId: "",
};

const adminTabs = [
  { id: "visao-geral", label: "Visao geral" },
  { id: "minha-operacao", label: "Minha operacao" },
  { id: "metas-fechamento", label: "Metas & Fechamento" },
  { id: "metodos", label: "Metodos" },
  { id: "ranking", label: "Ranking" },
  { id: "lixeira", label: "Lixeira" },
];

const defaultNetworks = ["888", "777", "WE", "W1", "VOY", "91", "DZ", "A8", "OKOK", "ANJO", "XW", "EK", "DY", "WP", "BRA", "GAME", "ALFA", "KK", "MK", "M9", "KF", "PU", "COROA", "MANGA", "AA", "FP"];

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
  const operations = (seed.operations || [
    {
      id: "OPM-888",
      title: "Meta 888 SEM34",
      platform: "781WIN",
      network: "888",
      model: "salario-bau",
      accountsTarget: 20,
      accountsCreated: 0,
      depositTotal: 0,
      withdrawTotal: 0,
      profit: 0,
      loss: 0,
      status: "ativa",
      successRate: 0,
      motherAccount: {
        link: "",
        login: "",
        password: "",
      },
      notes: "",
      createdAt: TODAY,
      updatedAt: TODAY,
      remessas: [],
    },
    {
      id: "OPM-777",
      title: "777 - Win",
      platform: "777",
      network: "777",
      model: "salario-bau",
      accountsTarget: 10,
      accountsCreated: 10,
      depositTotal: 1260,
      withdrawTotal: 1400,
      profit: 140,
      loss: 0,
      status: "encerrada",
      successRate: 100,
      motherAccount: {
        link: "777win.com/login",
        login: "admin777",
        password: "********",
      },
      notes: "Operacao finalizada com lucro positivo.",
      createdAt: "2026-07-14",
      updatedAt: "2026-07-14",
      closedAt: "2026-07-14",
      remessas: [
        {
          id: "REM-OPM-777-1",
          title: "1a remessa",
          type: "Remessa",
          initialBalance: 1500,
          accounts: 10,
          deposit: 1260,
          withdraw: 1400,
          status: "Normal",
          notes: "Fechamento da meta.",
          date: "2026-07-14",
        },
      ],
    },
  ]).map(normalizeOperation);

  return {
    ...seed,
    version: APP_VERSION,
    dailyGoal: Number(seed.dailyGoal || 500),
    availableNetworks: Array.from(new Set([...(seed.availableNetworks || []), ...defaultNetworks, ...(seed.networks || []).map((item) => item.mark || item.name || "").filter(Boolean)])),
    operations,
    profile: {
      ...seed.profile,
      updatedAt: seed.profile?.updatedAt || formatDateTime(new Date()),
    },
  };
}

function normalizeOperation(operation) {
  const remessas = (operation.remessas || []).map((item, index) => ({
    id: item.id || `${operation.id}-REM-${index + 1}`,
    title: item.title || `Remessa ${index + 1}`,
    type: item.type || "Remessa",
    initialBalance: Number(item.initialBalance || 0),
    accounts: Number(item.accounts || 0),
    deposit: Number(item.deposit || 0),
    withdraw: Number(item.withdraw || 0),
    status: item.status || "Normal",
    notes: item.notes || "",
    date: item.date || operation.createdAt || TODAY,
  }));

  const accountsTarget = Number(operation.accountsTarget || operation.accounts || 0);
  const accountsCreated = Number(operation.accountsCreated || sum(remessas, "accounts") || 0);
  const depositTotal = Number(operation.depositTotal || sum(remessas, "deposit") || 0);
  const withdrawTotal = Number(operation.withdrawTotal || sum(remessas, "withdraw") || 0);
  const result = withdrawTotal - depositTotal;
  const profit = Number(operation.profit ?? Math.max(result, 0));
  const loss = Number(operation.loss ?? Math.max(result * -1, 0));
  const successRate = Number(operation.successRate ?? percentNumber(accountsCreated, Math.max(accountsTarget, 1)));

  return {
    id: operation.id || `OPM-${Date.now()}`,
    title: operation.title || "Nova meta",
    platform: operation.platform || "",
    network: operation.network || "",
    model: operation.model || "salario-bau",
    accountsTarget,
    accountsCreated,
    depositTotal,
    withdrawTotal,
    profit,
    loss,
    status: operation.status || "ativa",
    successRate,
    motherAccount: {
      link: operation.motherAccount?.link || operation.link || "",
      login: operation.motherAccount?.login || operation.login || "",
      password: operation.motherAccount?.password || operation.password || "",
    },
    notes: operation.notes || "",
    createdAt: operation.createdAt || TODAY,
    updatedAt: operation.updatedAt || operation.createdAt || TODAY,
    closedAt: operation.closedAt || "",
    remessas,
  };
}

function persistData() {
  data.profile.updatedAt = formatDateTime(new Date());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function bindStaticEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("input", handleInput);

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
  const target = event.target.closest(
    "[data-section], [data-admin-tab], [data-range], [data-action], [data-close-dialog], [data-fill-accounts], [data-fill-daily-goal], [data-model], [data-operation-open], [data-operation-edit], [data-operation-finalize], [data-open-daily-goal], [data-quick-remessa-accounts]"
  );
  if (!target) return;

  if (target.dataset.section) {
    ui.section = target.dataset.section;
    persistUi();
    render();
    return;
  }

  if (target.dataset.adminTab) {
    ui.adminTab = target.dataset.adminTab;
    ui.currentOperationId = "";
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

  if (target.dataset.fillAccounts) {
    const input = document.querySelector("#operation-accounts");
    if (input) input.value = target.dataset.fillAccounts;
    return;
  }

  if (target.dataset.fillDailyGoal) {
    const input = document.querySelector("#daily-goal-value");
    if (input) input.value = formatMoneyInput(target.dataset.fillDailyGoal);
    return;
  }

  if (target.dataset.model) {
    selectOperationModel(target.dataset.model);
    return;
  }

  if (target.dataset.operationOpen) {
    ui.currentOperationId = target.dataset.operationOpen;
    persistUi();
    render();
    return;
  }

  if (target.dataset.operationEdit) {
    openOperationDialog(target.dataset.operationEdit);
    return;
  }

  if (target.dataset.operationFinalize) {
    finalizeOperation(target.dataset.operationFinalize);
    return;
  }

  if (target.dataset.quickRemessaAccounts) {
    const input = document.querySelector("#detail-remessa-accounts");
    if (input) {
      input.value = target.dataset.quickRemessaAccounts;
      updateRemessaPreview();
    }
    return;
  }

  if (target.dataset.action) runAction(target.dataset.action);
}

function handleSubmit(event) {
  if (event.target.id === "daily-goal-form") {
    event.preventDefault();
    submitDailyGoal();
    return;
  }

  if (event.target.id === "operation-form") {
    event.preventDefault();
    submitOperation();
    return;
  }

  if (event.target.id === "operation-remessa-form") {
    event.preventDefault();
    submitOperationRemessa();
    return;
  }

  if (event.target.id === "cost-form") {
    event.preventDefault();
    showToast("Essa aba vai receber o fluxo completo depois.", "alert");
    closeDialog("cost-dialog");
    return;
  }

  if (event.target.id === "remessa-form") {
    event.preventDefault();
    showToast("Agora o foco esta no fluxo interno de cada meta.", "alert");
    closeDialog("remessa-dialog");
  }
}

function handleInput(event) {
  if (event.target.closest("#operation-remessa-form")) {
    updateRemessaPreview();
  }
}

function runAction(action) {
  switch (action) {
    case "go-home":
      ui.section = "admin";
      ui.adminTab = "visao-geral";
      ui.currentOperationId = "";
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
      openOperationDialog();
      break;
    case "edit-daily-goal":
    case "open-daily-goal":
      openDailyGoalDialog();
      break;
    case "back-to-operations":
      ui.currentOperationId = "";
      persistUi();
      render();
      break;
    default:
      break;
  }
}

function render() {
  renderShell();
  content.innerHTML = renderAdmin();
  refreshDialogOptions();
  paintStaticIcons();
  drawOverviewChart();
  updateRemessaPreview();
}

function renderShell() {
  document.body.classList.toggle("sidebar-collapsed", ui.sidebarCollapsed);
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.section === ui.section);
  });

  document.querySelector("#profile-name").textContent = data.profile.owner;
  document.querySelector("#profile-role").textContent = data.profile.role;
  const sidebarProfileName = document.querySelector("#sidebar-profile-name");
  const sidebarProfileMeta = document.querySelector("#sidebar-profile-meta");
  if (sidebarProfileName) sidebarProfileName.textContent = data.profile.owner;
  if (sidebarProfileMeta) sidebarProfileMeta.textContent = `${data.profile.role} • ${data.profile.updatedAt}`;
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
  if (ui.currentOperationId) {
    const operation = findOperation(ui.currentOperationId);
    return {
      breadcrumb: `Admin • Minha operacao • ${operation?.title || "Operacao"}`,
      title: operation?.title || "Operacao",
      description: "Controle detalhado da meta, remessas e resultado ao vivo.",
      actionLabel: "Voltar ao painel",
      action: "back-to-operations",
    };
  }

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
      description: "Resumo das metas ativas, encerradas e da sua operacao atual.",
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
  if (ui.currentOperationId) return renderOperationDetail();

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
  const totals = getOverviewMetrics();
  const topNetworks = getTopNetworks();
  const status = totals.totalProfit >= 0 ? "Saudavel" : "Em alerta";
  const statusNote = totals.totalProfit >= 0 ? "Operacao acelerando - resultado consistente." : "A operacao precisa de revisao nas metas com menor retorno.";
  const record = Math.max(data.dailyGoal, totals.totalProfit, 140);
  const bestNetwork = topNetworks[0];

  return `
    <section class="screen-head">
      <div>
        <h1>Ola, ${escapeHtml(data.profile.owner)}</h1>
        <div class="screen-head__meta">
          <span class="status-dot"></span>
          <span>Dados em tempo real</span>
          <span class="screen-pill">${escapeHtml(String(data.profile.role || "FERRO").split("•")[0].trim())}</span>
          <span class="screen-pill screen-pill--danger">TRIAL • 1 DIA</span>
        </div>
      </div>
      <button class="refresh-bubble" data-action="refresh">Atualizar</button>
    </section>

    <section class="access-banner">
      <div class="access-banner__icon">
        <span data-icon="calendar"></span>
      </div>
      <div class="access-banner__copy">
        <strong>Seu acesso sera bloqueado amanha</strong>
        <p>Assine hoje para nao perder o controle da sua operacao.</p>
      </div>
      <div class="access-banner__countdown">
        <strong>1</strong>
        <small>DIA</small>
      </div>
      <button class="access-banner__cta">Assinar agora</button>
    </section>

    <section class="admin-tabs admin-tabs--frame">
      ${renderAdminTabs()}
    </section>

    <section class="daily-goal-card daily-goal-card--hero">
      <div class="daily-goal-card__copy">
        <div class="section-kicker">Meta do dia</div>
        <strong>${currency(totals.todayProfit)} / ${currency(data.dailyGoal)}</strong>
        <p>Faltam ${currency(Math.max(data.dailyGoal - totals.todayProfit, 0))} para bater sua meta diaria de lucro.</p>
      </div>
      <div class="daily-goal-card__track">
        <div class="daily-goal-card__legend">
          <span>recorde ${currency(record)}</span>
        </div>
        <div class="daily-goal-card__bar">
          <span style="width:${Math.max(4, Math.min(100, Math.round(percentNumber(totals.todayProfit, Math.max(data.dailyGoal, 1)))))}%"></span>
        </div>
      </div>
      <button class="icon-chip" data-action="open-daily-goal" aria-label="Editar meta do dia">
        <span data-icon="edit"></span>
      </button>
    </section>

    <section class="split-grid admin-overview-grid">
      <article class="chart-card overview-chart-panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Lucro - Julho</div>
            <h3>${currency(totals.totalProfit)}</h3>
            <p>Metas fechadas ${totals.goalsInSystem} • Operadores ${totals.accountsInSystem}</p>
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
        <div class="overview-chart-panel__meta">
          <div>
            <small>Metas fechadas</small>
            <strong>${totals.goalsInSystem}</strong>
          </div>
          <div>
            <small>Operadores</small>
            <strong>${totals.accountsInSystem}</strong>
          </div>
          <div>
            <small>Lucro apos custos</small>
            <strong class="money-green">${currency(totals.totalProfit)}</strong>
          </div>
        </div>
        <div class="overview-network-module">
          <div class="overview-network-module__head">
            <div>
              <strong>Top Redes Performance</strong>
              <p>Distribuicao do lucro por rede</p>
            </div>
          </div>
          <div class="overview-network-module__body">
            <div class="network-donut">
              <div class="network-donut__ring"></div>
              <div class="network-donut__center">${escapeHtml(bestNetwork?.network || "777")}</div>
            </div>
            <div class="network-donut__legend">
              ${topNetworks
                .map(
                  (item) => `
                    <div class="network-donut__item">
                      <span class="network-donut__dot"></span>
                      <strong>${escapeHtml(item.network)}</strong>
                      <span>${currency(item.profit)}</span>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
        </div>
      </article>

      <article class="chart-card overview-funnel-panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Funil da Operacao</div>
            <h3>Resumo geral</h3>
            <p>Visao consolidada do sistema</p>
          </div>
        </div>
        <div class="funnel-list admin-funnel">
          ${renderFunnelCard("Lucro total na plataforma", currency(totals.totalProfit))}
          ${renderFunnelCard("Lucro do dia", currency(totals.todayProfit))}
          ${renderFunnelCard("Contas no sistema", String(totals.accountsInSystem))}
          ${renderFunnelCard("Remessas no sistema", String(totals.remessasInSystem))}
          ${renderFunnelCard("Metas no sistema", String(totals.goalsInSystem))}
        </div>
      </article>
    </section>

    <section class="status-strip">
      <div class="status-strip__header">
        <span class="status-dot"></span>
        <div>
          <strong>Status: ${status}</strong>
          <p>${statusNote}</p>
        </div>
      </div>
      <div class="status-strip__success">Lucro total acumulado: ${currency(totals.totalProfit)}</div>
    </section>

    <section class="duo-grid overview-lower-grid">
      <article class="panel overview-reading-panel">
        <div class="section-kicker">Leitura da operacao</div>
        <div class="overview-reading-panel__grid">
          <div>
            <small>Melhor rede</small>
            <strong>${escapeHtml(bestNetwork?.network || "—")}</strong>
            <span>${bestNetwork ? `${currency(bestNetwork.profit)}/meta` : "Sem leitura ainda"}</span>
          </div>
          <div>
            <small>Risco operacional</small>
            <strong>${totals.totalProfit >= 0 ? "Nenhum" : "Moderado"}</strong>
            <span>${totals.totalProfit >= 0 ? "Todas as redes positivas" : "Existem metas abaixo da linha."}</span>
          </div>
        </div>
      </article>

      <article class="panel overview-forecast-panel">
        <div class="section-kicker">Previsao</div>
        <div class="overview-forecast-panel__grid">
          <div>
            <small>Media por meta</small>
            <strong>${currency(totals.averagePerGoal)}</strong>
          </div>
          <div>
            <small>Media por conta</small>
            <strong>${currency(totals.averagePerAccount)}</strong>
          </div>
          <div>
            <small>Projecao - 50 contas</small>
            <strong>${currency(totals.averagePerAccount * 50)}</strong>
          </div>
          <div>
            <small>Break-even</small>
            <strong>${Math.max(1, Math.round(data.dailyGoal / Math.max(totals.averagePerAccount || 1, 1)))} contas</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="duo-grid">
      <article class="panel slim-panel">
        <div class="section-head">
          <div>
            <h3>Atividade recente</h3>
          </div>
        </div>
        <div class="activity-list">
          ${getRecentActivity()
            .slice(0, 2)
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

      <article class="panel slim-panel">
        <div class="section-head">
          <div>
            <h3>Top operadores</h3>
          </div>
        </div>
        <div class="activity-list">
          ${data.operators
            .slice()
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 2)
            .map(
              (item) => `
                <div class="activity-item">
                  <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <div class="activity-item__meta">${escapeHtml(item.network)} • ${item.goalPct}% da meta</div>
                  </div>
                  <span class="money-green">${currency(item.profit)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
    </section>

    <section class="trio-grid locked-grid">
      ${["Previsao inteligente", "Ranking de redes", "Alertas estrategicos"]
        .map(
          (title) => `
            <article class="panel locked-card">
              <div class="locked-card__icon"></div>
              <strong>${title}</strong>
              <p>Recurso bloqueado no modo trial. Mantido apenas como espelho visual da interface de referencia.</p>
              <button class="button button--ghost" type="button">Seja PRO</button>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderMyOperation() {
  const operations = filterOperations(data.operations);
  const activeOperations = operations.filter((item) => item.status === "ativa");
  const closedOperations = operations.filter((item) => item.status !== "ativa");
  const summary = getOperationSummary(operations);

  return `
    <section class="screen-head">
      <div>
        <h1>Ola, ${escapeHtml(data.profile.owner)}</h1>
        <div class="screen-head__meta">
          <span class="status-dot"></span>
          <span>Dados em tempo real</span>
          <span class="screen-pill">${escapeHtml(String(data.profile.role || "FERRO").split("•")[0].trim())}</span>
          <span class="screen-pill screen-pill--danger">TRIAL • 1 DIA</span>
        </div>
      </div>
      <button class="refresh-bubble" data-action="refresh">Atualizar</button>
    </section>

    <section class="access-banner">
      <div class="access-banner__icon">
        <span data-icon="calendar"></span>
      </div>
      <div class="access-banner__copy">
        <strong>Seu acesso sera bloqueado amanha</strong>
        <p>Assine hoje para nao perder o controle da sua operacao.</p>
      </div>
      <div class="access-banner__countdown">
        <strong>1</strong>
        <small>DIA</small>
      </div>
      <button class="access-banner__cta">Assinar agora</button>
    </section>

    <section class="admin-tabs admin-tabs--frame">
      ${renderAdminTabs()}
    </section>

    <section class="panel operation-summary-card operation-summary-card--hero">
      <div class="section-head">
        <div>
          <div class="section-kicker">Centro de operacoes</div>
          <h3>Lucro total da operacao</h3>
          <p>Resumo breve das metas ativas, encerradas e da sua leitura operacional.</p>
        </div>
        <button class="button button--primary" data-action="new-operation">Nova meta</button>
      </div>
      <div class="operation-summary-card__value">${currency(summary.totalProfit)}</div>
      <div class="admin-kpi-grid">
        ${renderKpiRow("Metas ativas", String(activeOperations.length), "Em andamento agora")}
        ${renderKpiRow("Encerradas", String(closedOperations.length), "Historico finalizado")}
        ${renderKpiRow("Contas processadas", String(summary.accountsProcessed), "Base total acompanhada")}
        ${renderKpiRow("Remessas", String(summary.totalRemessas), "Movimentos registrados")}
        ${renderKpiRow("Taxa de acerto", `${summary.successRate}%`, "Leitura inicial")}
        ${renderKpiRow("ROI medio", `${summary.roiAverage}%`, "Media atual da operacao")}
      </div>
    </section>

    <section class="operation-sections">
      <div class="section-title-row">
        <strong>Operacoes ativas</strong>
        <span class="section-count">${activeOperations.length}</span>
      </div>
      <article class="panel section-panel operation-active-panel">
        <div class="operation-card-grid">
          ${activeOperations.length
            ? activeOperations.map((item) => renderOperationCard(item)).join("")
            : `<div class="empty-state compact">Nenhuma operacao ativa ainda.</div>`}
        </div>
      </article>

      <div class="section-title-row">
        <strong>Operacoes encerradas</strong>
        <span class="section-count">${closedOperations.length}</span>
      </div>
      <article class="panel section-panel">
        <div class="activity-list">
          ${closedOperations.length
            ? closedOperations
                .map(
                  (item) => `
                    <div class="activity-item">
                      <div>
                        <strong>${escapeHtml(item.title)}</strong>
                        <div class="activity-item__meta">${escapeHtml(item.platform)} • ${item.accountsTarget} contas • ${formatDisplayDate(item.closedAt || item.createdAt)}</div>
                      </div>
                      <span class="money-green">${currency(item.profit)}</span>
                    </div>
                  `
                )
                .join("")
            : `<div class="empty-state compact">Nenhuma operacao encerrada ainda.</div>`}
        </div>
      </article>

      <div class="section-title-row">
        <strong>Insights da operacao</strong>
      </div>
      <section class="trio-grid operation-insights-grid">
        <article class="panel insight-card">
          <small>Melhor meta</small>
          <strong>${escapeHtml(closedOperations[0]?.title || activeOperations[0]?.title || "Sem meta")}</strong>
          <span>${currency(Math.max(...operations.map((item) => item.profit), 0))}</span>
        </article>
        <article class="panel insight-card">
          <small>Maior prejuizo</small>
          <strong>${operations.some((item) => item.loss > 0) ? currency(Math.max(...operations.map((item) => item.loss), 0)) : "Nenhum prejuizo"}</strong>
          <span>Operacao no azul</span>
        </article>
        <article class="panel insight-card">
          <small>Melhor rede</small>
          <strong>${escapeHtml(getTopNetworks()[0]?.network || "777")}</strong>
          <span>${currency(getTopNetworks()[0]?.profit || 0)}</span>
        </article>
      </section>

      <div class="section-title-row">
        <strong>Atividade em tempo real</strong>
      </div>
      <article class="panel section-panel">
        <div class="section-head">
          <div></div>
        </div>
        <div class="activity-list">
          ${getRecentActivity()
            .slice(0, 3)
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

function renderOperationCard(operation) {
  return `
    <article class="operation-card operation-card--reference">
      <div class="operation-card__head">
        <strong>${escapeHtml(operation.network)}</strong>
        <span class="tiny-badge tiny-badge--live">EM ANDAMENTO</span>
      </div>
      <h4>${escapeHtml(operation.title)}</h4>
      <p>${escapeHtml(operation.platform)} • ${operation.accountsTarget} contas</p>
      <div class="operation-card__reference-grid">
        <div><small>Contas</small><strong>${operation.accountsCreated}/${operation.accountsTarget}</strong></div>
        <div><small>Remessas</small><strong>${operation.remessas.length}</strong></div>
        <div><small>Lucro atual</small><strong class="money-green">${currency(operation.profit)}</strong></div>
      </div>
      <div class="operation-card__progress-label">Progresso <span>${operationProgress(operation)}%</span></div>
      <div class="progress"><span style="width:${operationProgress(operation)}%"></span></div>
      <div class="operation-card__footer">
        <button class="button button--ghost" type="button" data-operation-open="${operation.id}">Abrir operacao</button>
      </div>
    </article>
  `;
}

function renderOperationDetail() {
  const operation = findOperation(ui.currentOperationId);
  if (!operation) {
    ui.currentOperationId = "";
    persistUi();
    return renderMyOperation();
  }

  const resultLiquid = operation.withdrawTotal - operation.depositTotal;
  const preview = getCurrentRemessaPreview();

  return `
    <section class="detail-topbar">
      <button class="button button--ghost detail-back" data-action="back-to-operations">
        <span data-icon="arrow-left"></span>
        <span>Voltar ao painel</span>
      </button>
    </section>

    <section class="detail-hero detail-hero--reference">
      <div>
        <div class="detail-hero__title-row">
          <h2>${escapeHtml(operation.title)}</h2>
          <span class="tiny-badge ${operation.status === "ativa" ? "tiny-badge--live" : ""}">${operation.status === "ativa" ? "Ao vivo" : "Encerrada"}</span>
        </div>
        <div class="detail-hero__meta">
          <span>${operation.accountsTarget} contas</span>
          <span>${operation.remessas.length} remessas</span>
          <span>${operation.successRate}% acerto</span>
          <span>${escapeHtml(operation.network)}</span>
        </div>
      </div>
      <div class="detail-hero__actions">
        <button class="button button--ghost" data-operation-edit="${operation.id}">
          <span data-icon="edit"></span>
          <span>Editar</span>
        </button>
        <button class="button button--primary" data-operation-finalize="${operation.id}">
          <span>Finalizar meta</span>
        </button>
      </div>
    </section>

    <section class="detail-metrics">
      ${renderDetailMetric("Deposito total", currency(operation.depositTotal), "neutral")}
      ${renderDetailMetric("Saque total", currency(operation.withdrawTotal), "neutral")}
      ${renderDetailMetric("Lucro acumulado", currency(operation.profit), "good")}
      ${renderDetailMetric("Prejuizo acum.", currency(operation.loss), "danger")}
      ${renderDetailMetric("Resultado liquido", currency(resultLiquid), resultLiquid >= 0 ? "good" : "danger")}
    </section>

    <section class="panel detail-progress-panel">
      <div class="section-head">
        <div>
          <div class="section-kicker">Progresso da meta</div>
          <h3>${operation.accountsCreated} de ${operation.accountsTarget} contas</h3>
          <p>Faltam ${Math.max(operation.accountsTarget - operation.accountsCreated, 0)} contas para fechar a meta.</p>
        </div>
        <strong class="detail-progress-panel__pct">${operationProgress(operation)}%</strong>
      </div>
      <div class="progress progress--detail"><span style="width:${operationProgress(operation)}%"></span></div>
    </section>

    <section class="detail-grid">
      <form id="operation-remessa-form" class="panel detail-form-panel">
        <div class="detail-form-grid">
          <div class="detail-form-column">
            <div class="section-kicker">1 • Dados</div>
            <label>
              Titulo
              <input id="detail-remessa-title" placeholder="1a remessa..." required />
            </label>
            <label>
              Tipo
              <select id="detail-remessa-type">
                <option value="Remessa">Remessa</option>
                <option value="Ajuste">Ajuste</option>
                <option value="Fechamento">Fechamento</option>
              </select>
            </label>
            <label>
              Saldo inicial
              <input id="detail-remessa-initial" type="number" min="0" step="0.01" value="0" />
            </label>
            <label>
              Contas
              <input id="detail-remessa-accounts" type="number" min="1" value="1" required />
            </label>
            <div class="quick-pills quick-pills--compact">
              <button type="button" class="pill-button" data-quick-remessa-accounts="3">3</button>
              <button type="button" class="pill-button" data-quick-remessa-accounts="5">5</button>
              <button type="button" class="pill-button" data-quick-remessa-accounts="10">10</button>
              <button type="button" class="pill-button" data-quick-remessa-accounts="15">15</button>
              <button type="button" class="pill-button" data-quick-remessa-accounts="20">20</button>
            </div>
          </div>

          <div class="detail-form-column">
            <div class="section-kicker">2 • Resultados</div>
            <label>
              Deposito
              <input id="detail-remessa-deposit" type="number" min="0" step="0.01" placeholder="Ex: 1055" required />
            </label>
            <label>
              Saque
              <input id="detail-remessa-withdraw" type="number" min="0" step="0.01" placeholder="Ex: 941" required />
            </label>
            <label>
              Comprovantes
              <button type="button" class="upload-shell">Anexar ou colar foto</button>
            </label>
            <label>
              Status
              <select id="detail-remessa-status">
                <option value="Normal">Normal</option>
                <option value="Pend.">Pend.</option>
                <option value="Bloq.">Bloq.</option>
                <option value="Anal.">Anal.</option>
              </select>
            </label>
            <label>
              Notas
              <textarea id="detail-remessa-notes" rows="4" placeholder="Opcional..."></textarea>
            </label>
          </div>

          <aside class="detail-form-aside">
            <div class="section-kicker">3 • Resumo ao vivo</div>
            <div class="preview-card">
              <strong>Resultado parcial</strong>
              <div id="detail-remessa-preview-value" class="preview-card__value">${currency(preview.result)}</div>
              <div class="preview-card__grid">
                <div>
                  <small>Por conta</small>
                  <span id="detail-remessa-preview-per-account">${currency(preview.perAccount)}</span>
                </div>
                <div>
                  <small>ROI</small>
                  <span id="detail-remessa-preview-roi">${preview.roi}%</span>
                </div>
                <div>
                  <small>Contas</small>
                  <span id="detail-remessa-preview-accounts">${preview.accounts}</span>
                </div>
              </div>
            </div>

            <button type="submit" class="button button--primary button--full">Registrar remessa</button>
          </aside>
        </div>
      </form>

      <section class="panel detail-history-panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Historico</div>
            <h3>Remessas registradas</h3>
            <p>Atualizacao dinamica da operacao.</p>
          </div>
        </div>
        <div class="activity-list">
          ${operation.remessas.length
            ? operation.remessas
                .slice()
                .reverse()
                .map(
                  (item) => `
                    <div class="activity-item">
                      <div>
                        <strong>${escapeHtml(item.title)}</strong>
                        <div class="activity-item__meta">${escapeHtml(item.type)} • ${item.accounts} contas • ${formatDisplayDate(item.date)}</div>
                      </div>
                      <span class="${item.withdraw - item.deposit >= 0 ? "money-green" : "money-red"}">${currency(item.withdraw - item.deposit)}</span>
                    </div>
                  `
                )
                .join("")
            : `<div class="empty-state compact">Nenhuma remessa cadastrada ainda.</div>`}
        </div>
      </section>
    </section>
  `;
}

function renderDetailMetric(label, value, tone) {
  return `
    <article class="detail-metric detail-metric--${tone}">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value)}</strong>
    </article>
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

function refreshDialogOptions() {
  const networkSelect = document.querySelector("#operation-network");
  if (networkSelect) {
    const currentValue = networkSelect.value;
    networkSelect.innerHTML = `<option value="">Selecione</option>${data.availableNetworks
      .map((item) => `<option value="${escapeAttribute(item)}">${escapeHtml(item)}</option>`)
      .join("")}`;
    networkSelect.value = currentValue;
  }

  const insightsNode = document.querySelector("#operation-insights");
  if (insightsNode) {
    const summary = getOperationSummary(data.operations);
    insightsNode.innerHTML = `
      <li>Media geral: ${currency(summary.perAccountAverage)}/conta (lucro)</li>
      <li>${data.operations.filter((item) => item.status !== "ativa").length} meta(s) fechada(s) • ${summary.accountsProcessed} depositantes processados</li>
      <li>Ultima rede operada: ${escapeHtml(data.operations[0]?.network || "777")}</li>
    `;
  }
}

function openDailyGoalDialog() {
  const input = document.querySelector("#daily-goal-value");
  if (input) input.value = formatMoneyInput(data.dailyGoal);
  openDialog("daily-goal-dialog");
}

function submitDailyGoal() {
  const value = parseMoneyInput(document.querySelector("#daily-goal-value")?.value);
  if (!value) {
    showToast("Informe um valor valido para a meta diaria.", "danger");
    return;
  }
  data.dailyGoal = value;
  persistData();
  closeDialog("daily-goal-dialog");
  showToast("Meta diaria atualizada com sucesso.", "good");
  render();
}

function openOperationDialog(operationId = "") {
  const dialogTitle = document.querySelector("#operation-dialog-title");
  const form = document.querySelector("#operation-form");
  if (!form) return;

  form.reset();
  refreshDialogOptions();
  document.querySelector("#operation-id").value = "";
  document.querySelector("#operation-model").value = "salario-bau";
  selectOperationModel("salario-bau");

  if (operationId) {
    const operation = findOperation(operationId);
    if (!operation) return;
    dialogTitle.textContent = "Editar meta";
    document.querySelector("#operation-id").value = operation.id;
    document.querySelector("#operation-platform").value = operation.platform;
    document.querySelector("#operation-network").value = operation.network;
    document.querySelector("#operation-title").value = operation.title;
    document.querySelector("#operation-accounts").value = operation.accountsTarget;
    document.querySelector("#operation-link").value = operation.motherAccount.link;
    document.querySelector("#operation-login").value = operation.motherAccount.login;
    document.querySelector("#operation-password").value = operation.motherAccount.password;
    selectOperationModel(operation.model);
  } else {
    dialogTitle.textContent = "Nova meta";
  }

  openDialog("operation-dialog");
}

function selectOperationModel(model) {
  document.querySelector("#operation-model").value = model;
  document.querySelectorAll(".model-card").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.model === model);
  });
}

function submitOperation() {
  const id = document.querySelector("#operation-id").value.trim();
  const platform = document.querySelector("#operation-platform").value.trim();
  const network = document.querySelector("#operation-network").value.trim();
  const title = document.querySelector("#operation-title").value.trim();
  const accountsTarget = Number(document.querySelector("#operation-accounts").value || 0);
  const model = document.querySelector("#operation-model").value;

  if (!platform || !network || !title || !accountsTarget) {
    showToast("Preencha plataforma, rede, titulo e contas para continuar.", "danger");
    return;
  }

  const payload = {
    title,
    platform,
    network,
    model,
    accountsTarget,
    motherAccount: {
      link: document.querySelector("#operation-link").value.trim(),
      login: document.querySelector("#operation-login").value.trim(),
      password: document.querySelector("#operation-password").value.trim(),
    },
  };

  if (id) {
    const operation = findOperation(id);
    Object.assign(operation, payload, {
      updatedAt: TODAY,
    });
    normalizeOperationInPlace(operation);
    showToast("Meta atualizada com sucesso.", "good");
  } else {
    const newOperation = normalizeOperation({
      id: nextOperationId(),
      ...payload,
      accountsCreated: 0,
      depositTotal: 0,
      withdrawTotal: 0,
      profit: 0,
      loss: 0,
      status: "ativa",
      successRate: 0,
      createdAt: TODAY,
      updatedAt: TODAY,
      remessas: [],
    });
    data.operations.unshift(newOperation);
    ui.currentOperationId = newOperation.id;
    ui.adminTab = "minha-operacao";
    showToast("Nova meta criada com sucesso.", "good");
  }

  if (!data.availableNetworks.includes(network)) data.availableNetworks.unshift(network);

  persistData();
  persistUi();
  closeDialog("operation-dialog");
  render();
}

function finalizeOperation(operationId) {
  const operation = findOperation(operationId);
  if (!operation) return;
  operation.status = "encerrada";
  operation.closedAt = TODAY;
  operation.updatedAt = TODAY;
  normalizeOperationInPlace(operation);
  persistData();
  showToast(`Meta ${operation.title} finalizada.`, "good");
  render();
}

function submitOperationRemessa() {
  const operation = findOperation(ui.currentOperationId);
  if (!operation) return;

  const title = document.querySelector("#detail-remessa-title").value.trim();
  const type = document.querySelector("#detail-remessa-type").value;
  const initialBalance = Number(document.querySelector("#detail-remessa-initial").value || 0);
  const accounts = Number(document.querySelector("#detail-remessa-accounts").value || 0);
  const deposit = Number(document.querySelector("#detail-remessa-deposit").value || 0);
  const withdraw = Number(document.querySelector("#detail-remessa-withdraw").value || 0);
  const status = document.querySelector("#detail-remessa-status").value;
  const notes = document.querySelector("#detail-remessa-notes").value.trim();

  if (!title || !accounts || (!deposit && !withdraw)) {
    showToast("Preencha titulo, contas e valores da remessa.", "danger");
    return;
  }

  operation.remessas.push({
    id: `${operation.id}-REM-${operation.remessas.length + 1}`,
    title,
    type,
    initialBalance,
    accounts,
    deposit,
    withdraw,
    status,
    notes,
    date: TODAY,
  });

  operation.accountsCreated = Math.min(operation.accountsTarget, operation.accountsCreated + accounts);
  operation.depositTotal += deposit;
  operation.withdrawTotal += withdraw;
  operation.updatedAt = TODAY;
  normalizeOperationInPlace(operation);

  document.querySelector("#operation-remessa-form").reset();
  document.querySelector("#detail-remessa-accounts").value = 1;
  persistData();
  showToast("Remessa registrada com sucesso.", "good");
  render();
}

function normalizeOperationInPlace(operation) {
  const normalized = normalizeOperation(operation);
  Object.assign(operation, normalized);
}

function getOverviewMetrics() {
  const scopedOperations = getScopedOperations();
  const scopedRemessas = scopedOperations.flatMap((item) => item.remessas.filter((remessa) => isDateInCurrentRange(remessa.date)));
  const totalProfit = sum(scopedOperations, "profit");
  const todayProfit = sum(
    data.operations.flatMap((item) => item.remessas).filter((item) => item.date === TODAY),
    "result",
    (item) => item.withdraw - item.deposit
  );
  const accountsInSystem = sum(scopedOperations, "accountsTarget");
  const remessasInSystem = scopedRemessas.length;
  const goalsInSystem = scopedOperations.length;
  return {
    totalProfit,
    todayProfit,
    accountsInSystem,
    remessasInSystem,
    goalsInSystem,
    averagePerGoal: goalsInSystem ? totalProfit / goalsInSystem : 0,
    averagePerAccount: accountsInSystem ? totalProfit / accountsInSystem : 0,
    activeOperations: data.operations.filter((item) => item.status === "ativa").length,
  };
}

function getTopNetworks() {
  const scopedOperations = getScopedOperations();
  const grouped = scopedOperations.reduce((acc, operation) => {
    const current = acc[operation.network] || { network: operation.network, profit: 0, goals: 0, accounts: 0 };
    current.profit += operation.profit;
    current.goals += 1;
    current.accounts += operation.accountsTarget;
    acc[operation.network] = current;
    return acc;
  }, {});
  return Object.values(grouped).sort((a, b) => b.profit - a.profit).slice(0, 4);
}

function getOperationSummary(operations) {
  const totalProfit = sum(operations, "profit");
  const accountsProcessed = sum(operations, "accountsCreated");
  const totalRemessas = operations.reduce((acc, item) => acc + item.remessas.length, 0);
  const closed = operations.filter((item) => item.status !== "ativa");
  const successRate = closed.length ? Math.round((closed.filter((item) => item.profit >= 0).length / closed.length) * 100) : 0;
  const roiAverage = operations.length
    ? Math.round(
        average(
          operations.map((item) => ({
            roi: item.depositTotal ? ((item.withdrawTotal - item.depositTotal) / item.depositTotal) * 100 : 0,
          })),
          "roi"
        )
      )
    : 0;
  return {
    totalProfit,
    accountsProcessed,
    totalRemessas,
    successRate,
    roiAverage,
    perAccountAverage: accountsProcessed ? totalProfit / accountsProcessed : 0,
  };
}

function getRecentActivity() {
  const operationEvents = data.operations
    .slice()
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 4)
    .map((operation) => ({
      title: operation.status === "ativa" ? `Operacao em andamento • ${operation.title}` : `Operacao concluida • ${operation.title}`,
      description: `${operation.platform} • ${operation.accountsCreated}/${operation.accountsTarget} contas • ${operation.remessas.length} remessas`,
      time: formatRelativeDate(operation.updatedAt || operation.createdAt),
    }));

  return operationEvents.length ? operationEvents : data.activity.slice(0, 4);
}

function getScopedOperations() {
  return data.operations.filter((operation) => {
    const baseDate = operation.closedAt || operation.updatedAt || operation.createdAt;
    return isDateInCurrentRange(baseDate);
  });
}

function findOperation(operationId) {
  return data.operations.find((item) => item.id === operationId);
}

function filterOperations(items) {
  if (!ui.search) return items;
  return items.filter((item) =>
    [item.title, item.platform, item.network, item.id].some((field) => String(field).toLowerCase().includes(ui.search))
  );
}

function operationProgress(operation) {
  return Math.max(0, Math.min(100, Math.round(percentNumber(operation.accountsCreated, Math.max(operation.accountsTarget, 1)))));
}

function drawOverviewChart() {
  const canvas = document.querySelector("#dashboard-chart");
  if (!canvas) return;

  const history = getRangeHistory();
  const ctx = canvas.getContext("2d");
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
  gradient.addColorStop(0, "rgba(255,59,48,0.35)");
  gradient.addColorStop(1, "rgba(255,59,48,0)");

  const points = values.map((value, index) => ({
    x: padding + stepX * index,
    y: height - padding - ((value - min) / span) * (height - padding * 2),
    value,
  }));

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
  const history = data.history || { labels: [], profit: [], revenue: [], costs: [] };
  const map = {
    hoje: 1,
    ontem: 1,
    "7d": 7,
    "30d": history.labels.length,
    mes: history.labels.length,
    tudo: history.labels.length,
  };
  const size = map[ui.range] || history.labels.length;
  const start = ui.range === "ontem" ? Math.max(0, history.labels.length - 2) : Math.max(0, history.labels.length - size);
  const end = ui.range === "ontem" ? Math.max(start + 1, history.labels.length - 1) : history.labels.length;
  return {
    labels: history.labels.slice(start, end),
    profit: history.profit.slice(start, end),
  };
}

function updateRemessaPreview() {
  const resultNode = document.querySelector("#detail-remessa-preview-value");
  if (!resultNode) return;

  const preview = getCurrentRemessaPreview();
  resultNode.textContent = currency(preview.result);
  document.querySelector("#detail-remessa-preview-per-account").textContent = currency(preview.perAccount);
  document.querySelector("#detail-remessa-preview-roi").textContent = `${preview.roi}%`;
  document.querySelector("#detail-remessa-preview-accounts").textContent = String(preview.accounts);
}

function getCurrentRemessaPreview() {
  const deposit = Number(document.querySelector("#detail-remessa-deposit")?.value || 0);
  const withdraw = Number(document.querySelector("#detail-remessa-withdraw")?.value || 0);
  const accounts = Number(document.querySelector("#detail-remessa-accounts")?.value || 0);
  const result = withdraw - deposit;
  return {
    result,
    accounts,
    perAccount: accounts ? result / accounts : 0,
    roi: deposit ? Math.round((result / deposit) * 100) : 0,
  };
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  file
    .text()
    .then((text) => {
      data = normalizeData(JSON.parse(text));
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

function isDateInCurrentRange(value) {
  if (!value) return false;
  const date = String(value).slice(0, 10);
  const diff = daysBetween(date, TODAY);

  switch (ui.range) {
    case "hoje":
      return date === TODAY;
    case "ontem":
      return diff === 1;
    case "7d":
      return diff >= 0 && diff <= 6;
    case "30d":
    case "mes":
      return diff >= 0 && diff <= 29;
    case "tudo":
    default:
      return true;
  }
}

function daysBetween(dateA, dateB) {
  const first = new Date(`${dateA}T00:00:00`);
  const second = new Date(`${dateB}T00:00:00`);
  return Math.round((second - first) / 86400000);
}

function nextOperationId() {
  const max = data.operations.reduce((acc, item) => {
    const value = Number(String(item.id).replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(acc, value) : acc;
  }, 888);
  return `OPM-${max + 1}`;
}

function sum(items, key, mapper) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, item) => acc + Number(mapper ? mapper(item) : key ? item[key] || 0 : item || 0), 0);
}

function average(items, key) {
  return items.length ? sum(items, key) / items.length : 0;
}

function percentNumber(part, total) {
  if (!total) return 0;
  return (part / total) * 100;
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
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : String(value);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatRelativeDate(value) {
  const diff = daysBetween(String(value).slice(0, 10), TODAY);
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  return `ha ${diff}d`;
}

function parseMoneyInput(value) {
  const normalized = String(value || "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  return Number(normalized || 0);
}

function formatMoneyInput(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "");
}

function paintStaticIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = iconMarkup(node.dataset.icon);
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
    "arrow-left": `<path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>`,
    users: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>`,
    network: `<circle cx="6" cy="6" r="2"></circle><circle cx="18" cy="6" r="2"></circle><circle cx="12" cy="18" r="2"></circle><path d="M8 7.5l2.8 7"></path><path d="M16 7.5 13.2 14.5"></path><path d="M8 6h8"></path>`,
    banknote: `<rect x="3" y="6" width="18" height="12" rx="2"></rect><circle cx="12" cy="12" r="2.5"></circle><path d="M7 10h.01"></path><path d="M17 14h.01"></path>`,
    receipt: `<path d="M4 3h16v18l-2.5-1.5L15 21l-2.5-1.5L10 21l-2.5-1.5L5 21 4 20V3z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path><path d="M8 15h5"></path>`,
    wallet: `<path d="M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1H5a2 2 0 0 0-2 2V7z"></path><path d="M3 10a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7z"></path><path d="M17 13h.01"></path>`,
    shield: `<path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z"></path>`,
    star: `<path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 3z"></path>`,
    bolt: `<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"></path>`,
    send: `<path d="M22 2 11 13"></path><path d="M22 2 15 22l-4-9-9-4 20-7z"></path>`,
    mic: `<path d="M12 18a4 4 0 0 0 4-4V8a4 4 0 0 0-8 0v6a4 4 0 0 0 4 4z"></path><path d="M19 10v4a7 7 0 0 1-14 0v-4"></path><path d="M12 21v-3"></path>`,
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
