const APP_VERSION = "2026.07.gs-control-cpa.v3";
const STORAGE_KEY = "gs-control-cpa-local-v3";
const UI_KEY = "gs-control-cpa-ui-v3";

const ui = {
  section: "dashboard",
  range: "30d",
  search: "",
  sidebarCollapsed: false,
  timelineFilter: "Todos",
};

let data = null;

const content = document.querySelector("#app-content");
const titleNode = document.querySelector("#page-title");
const descriptionNode = document.querySelector("#page-description");
const breadcrumbNode = document.querySelector("#breadcrumb");
const actionsNode = document.querySelector("#section-actions");
const searchNode = document.querySelector("#global-search");
const toastRegion = document.querySelector("#toast-region");

const sectionMeta = {
  dashboard: {
    breadcrumb: "Principal › Dashboard",
    title: "Dashboard",
    description: "Como está sua operação agora",
    actionLabel: "Nova operação",
    action: "open-remessa",
  },
  "meu-dia": {
    breadcrumb: "Principal › Meu Dia",
    title: "Meu Dia",
    description: "Tarefas, metas e pontos de atenção da sua rotina",
    actionLabel: "Nova tarefa",
    action: "create-task",
  },
  timeline: {
    breadcrumb: "Principal › Timeline",
    title: "Timeline Global",
    description: "Todas as atividades relevantes do sistema em ordem cronológica",
    actionLabel: "Atualizar timeline",
    action: "refresh",
  },
  favoritos: {
    breadcrumb: "Principal › Favoritos",
    title: "Favoritos",
    description: "Atalhos rápidos para tudo que você mais consulta",
    actionLabel: "Atualizar visão",
    action: "refresh",
  },
  operadores: {
    breadcrumb: "Operação › Operadores",
    title: "Operadores",
    description: "Desempenho, status, lucro e produtividade da equipe",
    actionLabel: "Novo operador",
    action: "create-operator",
  },
  gerentes: {
    breadcrumb: "Operação › Gerentes",
    title: "Gerentes",
    description: "Equipe de liderança e desempenho por gerente",
    actionLabel: "Novo gerente",
    action: "create-manager",
  },
  redes: {
    breadcrumb: "Operação › Redes",
    title: "Redes",
    description: "Clusters operacionais e distribuição de performance",
    actionLabel: "Nova rede",
    action: "create-network",
  },
  plataformas: {
    breadcrumb: "Operação › Plataformas",
    title: "Plataformas",
    description: "Integrações operacionais ativas em produção",
    actionLabel: "Nova plataforma",
    action: "create-platform",
  },
  metas: {
    breadcrumb: "Operação › Metas",
    title: "Metas",
    description: "Sistema completo de metas com progresso em tempo real",
    actionLabel: "Nova meta",
    action: "raise-goal",
  },
  financeiro: {
    breadcrumb: "Financeiro › Visão Geral",
    title: "Financeiro",
    description: "Visão consolidada de receita, custos e fluxo de caixa",
    actionLabel: "Nova entrada",
    action: "open-remessa",
  },
  custos: {
    breadcrumb: "Financeiro › Custos",
    title: "Custos",
    description: "Gestão detalhada de despesas e centros de custo",
    actionLabel: "Novo custo",
    action: "open-cost",
  },
  pix: {
    breadcrumb: "Financeiro › PIX",
    title: "PIX",
    description: "Gestão das chaves, roteamento e status operacional",
    actionLabel: "Nova chave",
    action: "create-pix",
  },
  remessas: {
    breadcrumb: "Financeiro › Remessas",
    title: "Remessas",
    description: "Entrada, distribuição e acompanhamento de operações",
    actionLabel: "Nova remessa",
    action: "open-remessa",
  },
  relatorios: {
    breadcrumb: "Inteligência › Relatórios",
    title: "Relatórios",
    description: "Snapshots e exportações estratégicas da operação",
    actionLabel: "Exportar visão",
    action: "export-json",
  },
};

async function init() {
  hydrateUi();
  await loadData();
  paintStaticIcons();
  bindStaticEvents();
  render();
  registerServiceWorker();
}

function hydrateUi() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
    Object.assign(ui, saved);
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
      // fallback
    }
  }

  const response = await fetch("data/seed.json");
  data = await response.json();
  persistData();
}

function persistData() {
  data.profile.updatedAt = formatDateTime(new Date());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function bindStaticEvents() {
  document.addEventListener("click", handleClick);
  document.querySelector("#cost-form").addEventListener("submit", submitCost);
  document.querySelector("#remessa-form").addEventListener("submit", submitRemessa);
  document.querySelector("#import-button").addEventListener("click", () => {
    document.querySelector("#import-input").click();
  });
  document.querySelector("#import-input").addEventListener("change", importJson);
  document.querySelector("#export-button").addEventListener("click", exportJson);
  document.querySelector("#reset-button").addEventListener("click", resetData);
  searchNode.addEventListener("input", (event) => {
    ui.search = event.target.value.trim().toLowerCase();
    render();
  });
}

function handleClick(event) {
  const target = event.target.closest(
    "[data-section], [data-action], [data-range], [data-close-dialog], [data-toggle-task], [data-timeline-filter], [data-row-action], [data-copy], [data-toggle-pix]"
  );
  if (!target) return;

  if (target.dataset.section) {
    ui.section = target.dataset.section;
    render();
    return;
  }

  if (target.dataset.range) {
    ui.range = target.dataset.range;
    render();
    return;
  }

  if (target.dataset.closeDialog) {
    closeDialog(target.dataset.closeDialog);
    return;
  }

  if (target.dataset.timelineFilter) {
    ui.timelineFilter = target.dataset.timelineFilter;
    render();
    return;
  }

  if (target.dataset.toggleTask) {
    const task = data.tasks.find((item) => item.id === target.dataset.toggleTask);
    if (!task) return;
    task.done = !task.done;
    persistData();
    showToast(task.done ? "Tarefa concluída." : "Tarefa reaberta.", task.done ? "good" : "alert");
    render();
    return;
  }

  if (target.dataset.rowAction) {
    showToast(`Ação "${target.dataset.rowAction}" simulada com sucesso.`, "good");
    return;
  }

  if (target.dataset.copy) {
    navigator.clipboard?.writeText(target.dataset.copy);
    showToast("Conteúdo copiado para a área de transferência.", "good");
    return;
  }

  if (target.dataset.togglePix) {
    const key = data.pix.find((item) => item.id === target.dataset.togglePix);
    if (!key) return;
    key.status = key.status === "ativa" ? "revisão" : "ativa";
    persistData();
    showToast(`Status da chave ${key.alias} atualizado.`, "good");
    render();
    return;
  }

  if (target.dataset.action) {
    runAction(target.dataset.action);
  }
}

function runAction(action) {
  if (action === "create-operator") {
    createOperator();
    render();
    return;
  }

  if (action === "create-manager") {
    createManager();
    render();
    return;
  }

  if (action === "create-network") {
    createNetwork();
    render();
    return;
  }

  if (action === "create-platform") {
    createPlatform();
    render();
    return;
  }

  if (action === "create-pix") {
    createPixKey();
    render();
    return;
  }

  switch (action) {
    case "go-home":
      ui.section = "dashboard";
      render();
      break;
    case "toggle-sidebar":
      ui.sidebarCollapsed = !ui.sidebarCollapsed;
      persistUi();
      renderShell();
      break;
    case "refresh":
      persistData();
      showToast("Leitura da operação atualizada.", "good");
      render();
      break;
    case "cycle-range":
      ui.range = ui.range === "30d" ? "7d" : ui.range === "7d" ? "90d" : ui.range === "90d" ? "12m" : "30d";
      render();
      break;
    case "open-cost":
      openDialog("cost-dialog");
      break;
    case "open-remessa":
      fillRemessaDefaults();
      openDialog("remessa-dialog");
      break;
    case "create-task":
      data.tasks.unshift({
        id: `task-${Date.now()}`,
        title: "Nova tarefa criada manualmente",
        when: "hoje",
        done: false,
      });
      persistData();
      showToast("Nova tarefa adicionada ao Meu Dia.", "good");
      render();
      break;
    case "create-operator":
    case "create-manager":
    case "create-network":
    case "create-platform":
    case "create-pix":
      showToast("Estrutura pronta para expansão. Posso aprofundar esse cadastro na próxima etapa.", "alert");
      break;
    case "raise-goal":
      data.goalsSummary.total += 1;
      data.goalsSummary.inProgress += 1;
      persistData();
      showToast("Meta estratégica adicionada ao ciclo.", "good");
      render();
      break;
    case "export-json":
      exportJson();
      break;
    default:
      break;
  }
}

function render() {
  renderShell();
  renderSection();
  paintDynamicIcons();
  drawCharts();
}

function renderShell() {
  document.body.classList.toggle("sidebar-collapsed", ui.sidebarCollapsed);
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.section === ui.section);
  });

  document.querySelector("#profile-name").textContent = data.profile.owner;
  document.querySelector("#profile-role").textContent = data.profile.role;
  searchNode.value = ui.search;

  const meta = sectionMeta[ui.section];
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

function renderSection() {
  switch (ui.section) {
    case "dashboard":
      content.innerHTML = renderDashboard();
      break;
    case "meu-dia":
      content.innerHTML = renderMeuDia();
      break;
    case "timeline":
      content.innerHTML = renderTimeline();
      break;
    case "favoritos":
      content.innerHTML = renderFavoritos();
      break;
    case "operadores":
      content.innerHTML = renderOperadores();
      break;
    case "gerentes":
      content.innerHTML = renderGerentes();
      break;
    case "redes":
      content.innerHTML = renderRedes();
      break;
    case "plataformas":
      content.innerHTML = renderPlataformas();
      break;
    case "metas":
      content.innerHTML = renderMetas();
      break;
    case "financeiro":
      content.innerHTML = renderFinanceiro();
      break;
    case "custos":
      content.innerHTML = renderCustos();
      break;
    case "pix":
      content.innerHTML = renderPix();
      break;
    case "remessas":
      content.innerHTML = renderRemessas();
      break;
    case "relatorios":
      content.innerHTML = renderRelatorios();
      break;
    default:
      content.innerHTML = `<div class="empty-state">Módulo em preparação.</div>`;
  }
}

function renderDashboard() {
  const financial = getFinancialSummary();
  const activeOps = data.operators.filter((item) => item.status !== "offline").length;
  const topNetwork = [...data.networks].sort((a, b) => b.profit - a.profit)[0];
  const topOperator = [...data.operators].sort((a, b) => b.profit - a.profit)[0];

  return `
    <section class="metrics-grid">
      ${renderMetricCard({
        icon: "banknote",
        label: "Lucro total",
        value: currency(financial.profit),
        change: "↑ 18.4%",
        tone: "good",
        spark: data.history.profit,
        sparkColor: "#29d467",
      })}
      ${renderMetricCard({
        icon: "chart-up",
        label: "Receita",
        value: currency(financial.revenue),
        change: "↑ 14.8%",
        tone: "good",
        spark: data.history.revenue,
        sparkColor: "#2ea0ff",
      })}
      ${renderMetricCard({
        icon: "percent",
        label: "ROI",
        value: `${financial.roi}%`,
        change: "↑ 9.2%",
        tone: "good",
        spark: data.history.roi,
        sparkColor: "#4d8dff",
      })}
      ${renderMetricCard({
        icon: "users",
        label: "Op. trabalhando",
        value: String(activeOps),
        change: "↑ 6.2%",
        tone: "good",
        spark: data.history.activeOperators,
        sparkColor: "#29d467",
      })}
    </section>

    <section class="insight-strip">
      ${renderInsightPill("Melhor rede", topNetwork.name, `${compactCurrency(topNetwork.profit)} em lucro consolidado`)}
      ${renderInsightPill("Operador líder", topOperator.name, `${currency(topOperator.profit)} • ROI ${topOperator.roi}%`)}
      ${renderInsightPill("Margem operacional", `${financial.margin}%`, `Conversão atual em ${financial.conversion}% da base ativa`)}
      ${renderInsightPill("Pressão de custo", `${percent(financial.costs, financial.revenue)}%`, "Peso do custo sobre a receita consolidada")}
    </section>

    <section class="split-grid">
      <article class="chart-card">
        <div class="section-head">
          <div>
            <div class="section-kicker">Centro de comando</div>
            <h2>Curva de Performance</h2>
            <p>Lucro, receita e custos consolidados</p>
          </div>
          <div class="segmented">
            ${rangeOption("7d")}
            ${rangeOption("30d")}
            ${rangeOption("90d")}
            ${rangeOption("12m")}
          </div>
        </div>
        <div class="canvas-wrap"><canvas id="dashboard-chart" width="980" height="340"></canvas></div>
      </article>

      <article class="chart-card">
        <div class="section-head">
          <div>
            <div class="section-kicker">Ciclo operacional</div>
            <h2>Funil Operacional</h2>
            <p>Fluxo dos operadores no ciclo</p>
          </div>
        </div>
        <div class="funnel-list">
          ${funnelRow("Cadastrados", data.operators.length, 100)}
          ${funnelRow("Ativos", activeOps, 82)}
          ${funnelRow("Trabalhando", activeOps - 1, 64)}
          ${funnelRow("Batendo meta", data.operators.filter((item) => item.goalPct >= 80).length, 34)}
          ${funnelRow("Taxa de conversão", `${financial.conversion}%`, 25, "good")}
        </div>
      </article>
    </section>

    <section class="duo-grid">
      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Monitoramento</div>
            <h3>Alertas prioritários</h3>
            <p>Nada acumulando sem revisão</p>
          </div>
          <span class="timeline-item__time">Hoje</span>
        </div>
        <div class="priority-grid">
          ${data.priorityAlerts
            .map(
              (item) => `
                <div class="mini-alert mini-alert--${item.tone}">
                  <h4>${escapeHtml(item.title)}</h4>
                  <p>${escapeHtml(item.body)}</p>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="activity-card">
        <div class="section-head">
          <div>
            <div class="section-kicker">Tempo real</div>
            <h3>Alertas & Atividades</h3>
            <p>Tempo real</p>
          </div>
        </div>
        <div class="activity-list">
          ${data.activity
            .slice(0, 5)
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

    <section class="duo-grid">
      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Leitura do comando</div>
            <h3>Radar da operação</h3>
            <p>Leitura rápida do momento atual da base</p>
          </div>
        </div>
        <div class="signal-list">
          ${renderSignalCard("Melhor cluster", topNetwork.name, `${topNetwork.goalPct}% da meta com ${topNetwork.operators} operadores`, "good")}
          ${renderSignalCard("Ponto de atenção", `${data.operators.filter((item) => item.goalPct < 60).length} operadores`, "Abaixo de 60% da meta individual", "alert")}
          ${renderSignalCard("Proteção financeira", currency(financial.reserve), "Reserva disponível para absorver pressão de caixa", "good")}
        </div>
      </article>

      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Pulse GS</div>
            <h3>Snapshot executivo</h3>
            <p>Resumo para decisão rápida</p>
          </div>
        </div>
        <div class="mini-grid">
          ${renderMiniPanel("Base ativa", String(activeOps), "Operadores em produção agora")}
          ${renderMiniPanel("Meta alta", String(data.operators.filter((item) => item.goalPct >= 80).length), "Acima de 80% da meta")}
          ${renderMiniPanel("Redes fortes", String(data.networks.filter((item) => item.goalPct >= 85).length), "Clusters próximos do alvo")}
          ${renderMiniPanel("Remessas hoje", String(data.remessas.filter((item) => item.date === today()).length), "Movimentações do dia")}
        </div>
      </article>
    </section>
  `;
}

function renderMeuDia() {
  const doneTasks = data.tasks.filter((item) => item.done).length;
  const progress = Math.round((doneTasks / Math.max(data.tasks.length, 1)) * 100);
  const todayGoals = data.goals.filter((item) => item.scope !== "plataforma").slice(0, 3);
  const lowOps = data.operators.filter((item) => item.goalPct < 60);
  const financial = getFinancialSummary();

  return `
    <section class="duo-grid">
      <article class="task-card">
        <div class="section-head">
          <div>
            <h2>Tarefas do dia</h2>
            <p>${doneTasks} de ${data.tasks.length} concluídas</p>
          </div>
          <div style="min-width:140px">
            <div class="progress"><span style="width:${progress}%"></span></div>
          </div>
        </div>
        <div class="tasks-list">
          ${data.tasks
            .map(
              (task) => `
                <button class="task-item ${task.done ? "is-done" : ""}" data-toggle-task="${task.id}">
                  <span class="task-check"></span>
                  <div style="flex:1;">
                    <strong>${escapeHtml(task.title)}</strong>
                  </div>
                  <span class="timeline-item__time">${escapeHtml(task.when)}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="task-card">
        <div class="section-head">
          <div>
            <h2>Financeiro hoje</h2>
            <p>Consolidado do dia</p>
          </div>
        </div>
        <div class="activity-list">
          ${todayMetric("Lucro", currency(financial.todayProfit), "+12.3%")}
          ${todayMetric("Receita", currency(financial.todayRevenue), "+8.1%")}
          ${todayMetric("Operadores ativos", String(data.operators.filter((item) => item.status !== "offline").length), "+4")}
        </div>
      </article>
    </section>

    <section class="duo-grid">
      <article class="panel">
        <div class="section-head">
          <div>
            <h3>Metas do dia</h3>
            <p>Próximas do prazo</p>
          </div>
        </div>
        <div class="activity-list">
          ${todayGoals
            .map(
              (goal) => `
                <div class="activity-item">
                  <div style="flex:1;">
                    <strong>${escapeHtml(goal.title)}</strong>
                    <div class="progress" style="margin-top:12px;"><span style="width:${goal.progress}%"></span></div>
                  </div>
                  <span class="timeline-item__time">${goal.due}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="panel">
        <div class="section-head">
          <div>
            <h3>Operadores em atenção</h3>
            <p>Abaixo de 60% da meta individual</p>
          </div>
        </div>
        <div class="attention-list">
          ${lowOps
            .map(
              (operator) => `
                <div class="attention-item">
                  <div class="person-cell">
                    <span class="avatar">${initials(operator.name)}</span>
                    <div class="person-meta">
                      <strong>${escapeHtml(operator.name)}</strong>
                      <small>${escapeHtml(operator.network)} • ${operator.goalPct}% da meta</small>
                    </div>
                  </div>
                  <span class="money-red">${currency(operator.profit)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function renderTimeline() {
  const items = data.timeline.filter((item) => {
    if (ui.timelineFilter === "Todos") return matchesSearch([item.title, item.subtitle, item.author]);
    return item.type === ui.timelineFilter.toLowerCase() && matchesSearch([item.title, item.subtitle, item.author]);
  });

  return `
    <section class="panel">
      <div class="filter-row">
        ${["Todos", "operador", "meta", "custo", "pix", "remessa", "edição", "exclusão"]
          .map(
            (label) => `
              <button
                class="filter-chip ${normalizeTimelineFilter(label) === normalizeTimelineFilter(ui.timelineFilter) ? "is-active" : ""}"
                data-timeline-filter="${label === "Todos" ? "Todos" : label}"
              >
                ${capitalize(label)}
              </button>
            `
          )
          .join("")}
      </div>

      <div class="timeline-feed">
        ${items
          .map(
            (item) => `
              <div class="timeline-item">
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  <div class="timeline-item__meta">${escapeHtml(item.subtitle)}</div>
                  <div class="timeline-item__meta">por ${escapeHtml(item.author)}</div>
                </div>
                <span class="timeline-item__time">${escapeHtml(item.time)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderFavoritos() {
  const favorites = [
    { title: "Resumo financeiro", body: "Acesso rápido ao caixa, margem, ROI e curva do período.", action: "financeiro" },
    { title: "Operadores em risco", body: "Lista pronta dos operadores abaixo de 60% da meta.", action: "operadores" },
    { title: "Redes mais lucrativas", body: "Veja imediatamente onde está o melhor retorno.", action: "redes" },
  ];

  return `
    <section class="report-grid">
      ${favorites
        .map(
          (item) => `
            <article class="report-card">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.body)}</p>
              <button class="button button--primary" data-section="${item.action}">Abrir módulo</button>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderOperadores() {
  const rows = data.operators.filter((item) =>
    matchesSearch([item.name, item.id, item.network, item.platform, item.manager, item.city])
  );
  const topOperator = [...rows].sort((a, b) => b.profit - a.profit)[0];
  const avgRoi = rows.length ? Math.round(sum(rows, "roi") / rows.length) : 0;

  return `
    <section class="metrics-grid">
      ${renderMetricCard({ icon: "users", label: "Total", value: String(data.operators.length), change: "", tone: "good" })}
      ${renderMetricCard({
        icon: "users",
        label: "Online agora",
        value: String(data.operators.filter((item) => item.status === "online").length),
        change: "↑ 4.1%",
        tone: "good",
      })}
      ${renderMetricCard({ icon: "banknote", label: "Lucro somado", value: currency(sum(rows, "profit")), change: "↑ 12.8%", tone: "good" })}
      ${renderMetricCard({ icon: "target", label: "Média de meta", value: `${average(rows, "goalPct").toFixed(1)}%`, change: "↑ 2.4%", tone: "good" })}
    </section>

    <section class="duo-grid">
      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Time ativo</div>
            <h3>Radar da equipe</h3>
            <p>Sinais de produtividade e risco operacional</p>
          </div>
        </div>
        <div class="mini-grid">
          ${renderMiniPanel("Top operador", topOperator ? topOperator.name : "—", topOperator ? currency(topOperator.profit) : "Sem dados")}
          ${renderMiniPanel("ROI médio", `${avgRoi}%`, "Retorno médio da equipe filtrada")}
          ${renderMiniPanel("Em atenção", String(rows.filter((item) => item.goalPct < 60).length), "Abaixo de 60% da meta")}
          ${renderMiniPanel("Offline", String(rows.filter((item) => item.status === "offline").length), "Fora de operação agora")}
        </div>
      </article>

      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Distribuição</div>
            <h3>Status operacional</h3>
            <p>Como a base está distribuída neste momento</p>
          </div>
        </div>
        <div class="kpi-list">
          ${renderKpiRow("Online", String(rows.filter((item) => item.status === "online").length), "Operando normalmente")}
          ${renderKpiRow("Trabalhando", String(rows.filter((item) => item.status === "trabalhando").length), "Em fluxo ativo")}
          ${renderKpiRow("Pausa", String(rows.filter((item) => item.status === "pausa").length), "Aguardando retorno")}
          ${renderKpiRow("Offline", String(rows.filter((item) => item.status === "offline").length), "Sem atividade atual")}
        </div>
      </article>
    </section>

    <section class="duo-grid">
      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Fluxo do dia</div>
            <h3>Leitura de remessas</h3>
            <p>Visão rápida do tráfego operacional</p>
          </div>
        </div>
        <div class="signal-list">
          ${renderSignalCard("Concluídas", String(completed.length), `${completed.length ? currency(sum(completed, "value")) : "Sem volume"} liquidados`, "good")}
          ${renderSignalCard("Processando", String(processing.length), "Operações exigindo acompanhamento ativo", processing.length ? "alert" : "good")}
          ${renderSignalCard("Maior remessa", topRemessa ? topRemessa.id : "—", topRemessa ? `${currency(topRemessa.value)} • ${topRemessa.network}` : "Sem dados", "good")}
        </div>
      </article>

      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Roteamento</div>
            <h3>Origem x destino</h3>
            <p>Principais pares em circulação</p>
          </div>
        </div>
        <div class="kpi-list">
          ${rows.slice(0, 4).map((item) => renderKpiRow(item.id, `${item.source} → ${item.target}`, `${item.operator} • ROI ${item.roi}%`)).join("")}
        </div>
      </article>
    </section>

    <section class="table-card">
      <div class="table-toolbar">
        <div class="table-search">
          <span data-icon="search"></span>
          <input value="${escapeHtml(searchNode.value)}" disabled />
        </div>
        <div class="inline-actions">
          <button class="button button--ghost" data-action="export-json">Exportar</button>
        </div>
      </div>

      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>Operador</th>
              <th>Gerente</th>
              <th>Status</th>
              <th>Rede</th>
              <th>Meta</th>
              <th>Lucro</th>
              <th>ROI</th>
              <th>Último acesso</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (item) => `
                  <tr>
                    <td>
                      <div class="person-cell">
                        <span class="avatar">${initials(item.name)}</span>
                        <div class="person-meta">
                          <strong>${escapeHtml(item.name)}</strong>
                          <small>${escapeHtml(item.id)} • ${escapeHtml(item.city)}</small>
                        </div>
                      </div>
                    </td>
                    <td>${escapeHtml(item.manager)}</td>
                    <td>${statusBadge(item.status)}</td>
                    <td>${escapeHtml(item.network)}</td>
                    <td>
                      <div class="progress ${item.goalPct >= 90 ? "progress--green" : ""}">
                        <span style="width:${item.goalPct}%"></span>
                      </div>
                    </td>
                    <td class="${item.profit >= 0 ? "money-green" : "money-red"}">${currency(item.profit)}</td>
                    <td>${item.roi}%</td>
                    <td>${escapeHtml(item.lastSeen)}</td>
                    <td>
                      <div class="inline-actions">
                        ${rowAction("view")}
                        ${rowAction("edit")}
                        ${rowAction("pause")}
                        ${rowAction("delete")}
                      </div>
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderGerentes() {
  const rows = data.managers.filter((item) => matchesSearch([item.name, item.email, item.role]));
  return `
    <section class="metrics-grid">
      ${renderMetricCard({ icon: "user-cog", label: "Total", value: String(data.managers.length), change: "", tone: "good" })}
      ${renderMetricCard({ icon: "user-cog", label: "Ativos", value: String(rows.filter((item) => item.status === "ativo").length), change: "↑ 0.0%", tone: "good" })}
      ${renderMetricCard({ icon: "users", label: "Equipes", value: String(sum(rows, "team")), change: "↑ 6.2%", tone: "good" })}
      ${renderMetricCard({ icon: "banknote", label: "Lucro consolidado", value: currency(sum(rows, "profit")), change: "↑ 11.8%", tone: "good" })}
    </section>

    <section class="table-card">
      <div class="table-toolbar">
        <div class="table-search">
          <span data-icon="search"></span>
          <input value="${escapeHtml(searchNode.value)}" disabled />
        </div>
        <button class="button button--ghost" data-action="export-json">Exportar</button>
      </div>
      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>Gerente</th>
              <th>Email</th>
              <th>Equipe</th>
              <th>Lucro</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (item) => `
                  <tr>
                    <td>
                      <div class="person-cell">
                        <span class="avatar">${initials(item.name)}</span>
                        <div class="person-meta">
                          <strong>${escapeHtml(item.name)}</strong>
                          <small>${escapeHtml(item.id)} • ${escapeHtml(item.role)}</small>
                        </div>
                      </div>
                    </td>
                    <td>${escapeHtml(item.email)}</td>
                    <td>${item.team}</td>
                    <td class="money-green">${currency(item.profit)}</td>
                    <td>${statusBadge(item.status)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderRedes() {
  const rows = data.networks.filter((item) => matchesSearch([item.name, item.code, item.status]));
  const topNetwork = [...rows].sort((a, b) => b.profit - a.profit)[0];
  const lowNetwork = [...rows].sort((a, b) => a.goalPct - b.goalPct)[0];

  return `
    <section class="metrics-grid">
      ${renderMetricCard({ icon: "network", label: "Total", value: String(data.networks.length), change: "", tone: "good" })}
      ${renderMetricCard({ icon: "network", label: "Ativas", value: String(rows.filter((item) => item.status === "ativa").length), change: "↑ 8.3%", tone: "good" })}
      ${renderMetricCard({ icon: "users", label: "Operadores", value: String(sum(rows, "operators")), change: "↑ 4.6%", tone: "good" })}
      ${renderMetricCard({ icon: "banknote", label: "Lucro somado", value: compactCurrency(sum(rows, "profit")), change: "↑ 14.2%", tone: "good" })}
    </section>

    <section class="duo-grid">
      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Estratégia de rede</div>
            <h3>Pulso das redes</h3>
            <p>Direção visual dos clusters mais relevantes</p>
          </div>
        </div>
        <div class="signal-list">
          ${renderSignalCard("Rede líder", topNetwork ? topNetwork.name : "—", topNetwork ? `${compactCurrency(topNetwork.profit)} • ROI ${topNetwork.roi}%` : "Sem dados", "good")}
          ${renderSignalCard("Menor aderência", lowNetwork ? lowNetwork.name : "—", lowNetwork ? `${lowNetwork.goalPct}% da meta atual` : "Sem dados", "alert")}
          ${renderSignalCard("Capacidade total", String(sum(rows, "operators")), "Operadores distribuídos entre as redes ativas", "good")}
        </div>
      </article>

      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Mix operacional</div>
            <h3>Leitura de distribuição</h3>
            <p>Onde a operação está mais concentrada</p>
          </div>
        </div>
        <div class="kpi-list">
          ${rows.slice(0, 4).map((item) => renderKpiRow(item.name, `${item.operators} ops`, `${item.goalPct}% de meta • perf. ${item.performance}%`)).join("")}
        </div>
      </article>
    </section>

    <section class="network-grid">
      ${rows.map(renderNetworkCard).join("")}
    </section>
  `;
}

function renderPlataformas() {
  const rows = data.platforms.filter((item) => matchesSearch([item.name, item.domain, item.network, item.category]));

  return `
    <section class="metrics-grid">
      ${renderMetricCard({ icon: "layers", label: "Total", value: String(data.platforms.length), change: "", tone: "good" })}
      ${renderMetricCard({ icon: "activity", label: "Ativas", value: String(rows.filter((item) => item.status === "ativa").length), change: "↑ 3.1%", tone: "good" })}
      ${renderMetricCard({ icon: "users", label: "Operadores", value: String(sum(rows, "operators")), change: "↑ 5.2%", tone: "good" })}
      ${renderMetricCard({ icon: "banknote", label: "Lucro", value: compactCurrency(sum(rows, "profit")), change: "↑ 12.1%", tone: "good" })}
    </section>

    <section class="table-card">
      <div class="table-toolbar">
        <div class="table-search">
          <span data-icon="search"></span>
          <input value="${escapeHtml(searchNode.value)}" disabled />
        </div>
        <button class="button button--ghost" data-action="export-json">Exportar</button>
      </div>
      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>Plataforma</th>
              <th>Rede</th>
              <th>Categoria</th>
              <th>Operadores</th>
              <th>Lucro</th>
              <th>Meta</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (item) => `
                  <tr>
                    <td>
                      <div class="person-cell">
                        <span class="avatar">${item.name.charAt(0)}</span>
                        <div class="person-meta">
                          <strong>${escapeHtml(item.name)}</strong>
                          <small>${escapeHtml(item.domain)}</small>
                        </div>
                      </div>
                    </td>
                    <td>${escapeHtml(item.network)}</td>
                    <td>${escapeHtml(item.category)}</td>
                    <td>${item.operators}</td>
                    <td class="money-green">${currency(item.profit)}</td>
                    <td>
                      <div class="progress ${item.goalPct >= 90 ? "progress--green" : ""}">
                        <span style="width:${item.goalPct}%"></span>
                      </div>
                    </td>
                    <td>${statusBadge(item.status)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderMetas() {
  const goals = data.goals.filter((item) => matchesSearch([item.title, item.owner, item.scope]));
  const globalGoals = goals.filter((item) => item.scope === "global");
  const networkGoals = goals.filter((item) => item.scope === "rede");
  const platformGoals = goals.filter((item) => item.scope === "plataforma");

  return `
    <section class="metrics-grid">
      ${renderMetricCard({ icon: "target", label: "Total", value: String(data.goalsSummary.total), change: "", tone: "good" })}
      ${renderMetricCard({ icon: "check-circle", label: "Concluídas", value: String(data.goalsSummary.closed), change: "↑ 25.0%", tone: "good" })}
      ${renderMetricCard({ icon: "clock", label: "Em progresso", value: String(data.goalsSummary.inProgress), change: "", tone: "good" })}
      ${renderMetricCard({ icon: "chart-up", label: "Progresso médio", value: `${data.goalsSummary.average}%`, change: "↑ 4.8%", tone: "good" })}
    </section>

    <section class="goal-grid">
      ${globalGoals.map(renderGoalCard).join("")}
    </section>
    <section class="goal-grid">
      ${networkGoals.map(renderGoalCard).join("")}
    </section>
    <section class="goal-grid">
      ${platformGoals.map(renderGoalCard).join("")}
    </section>
  `;
}

function renderFinanceiro() {
  const financial = getFinancialSummary();
  return `
    <section class="metrics-grid">
      ${renderMetricCard({ icon: "banknote", label: "Receita", value: currency(financial.revenue), change: "↑ 14.8%", tone: "good", spark: data.history.revenue, sparkColor: "#2ea0ff" })}
      ${renderMetricCard({ icon: "receipt", label: "Custos", value: currency(financial.costs), change: "↘ 5.4%", tone: "danger", spark: data.history.costs, sparkColor: "#ef4444" })}
      ${renderMetricCard({ icon: "chart-up", label: "Lucro", value: currency(financial.profit), change: "↑ 18.4%", tone: "good", spark: data.history.profit, sparkColor: "#29d467" })}
      ${renderMetricCard({ icon: "percent", label: "Margem", value: `${financial.margin}%`, change: "↑ 2.1%", tone: "good" })}
    </section>

    <section class="metrics-grid">
      ${renderMetricCard({ icon: "percent", label: "ROI", value: `${financial.roi}%`, change: "↑ 9.2%", tone: "good" })}
      ${renderMetricCard({ icon: "wallet", label: "Saldo", value: currency(financial.balance), change: "↑ 6.4%", tone: "good" })}
      ${renderMetricCard({ icon: "shield", label: "Reservas", value: currency(financial.reserve), change: "↑ 1.2%", tone: "good" })}
      ${renderMetricCard({ icon: "chart-up", label: "Fluxo caixa", value: currency(financial.cashFlow), change: "↑ 8.9%", tone: "good" })}
    </section>

    <section class="chart-card">
      <div class="section-head">
        <div>
          <div class="section-kicker">Fluxo consolidado</div>
          <h2>Curva de Performance</h2>
          <p>Lucro, receita e custos consolidados</p>
        </div>
        <div class="segmented">
          ${rangeOption("7d")}
          ${rangeOption("30d")}
          ${rangeOption("90d")}
          ${rangeOption("12m")}
        </div>
      </div>
      <div class="canvas-wrap"><canvas id="finance-chart" width="980" height="340"></canvas></div>
    </section>

    <section class="duo-grid">
      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Leitura financeira</div>
            <h3>Resumo executivo</h3>
            <p>Indicadores para decidir com velocidade</p>
          </div>
        </div>
        <div class="signal-list">
          ${renderSignalCard("Margem atual", `${financial.margin}%`, "Conversão atual de receita em lucro líquido", "good")}
          ${renderSignalCard("Reserva tática", currency(financial.reserve), "Cobertura disponível para choques operacionais", "good")}
          ${renderSignalCard("Pressão de custo", `${percent(financial.costs, financial.revenue)}%`, "Peso dos custos sobre a receita consolidada", "alert")}
        </div>
      </article>

      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Meta da companhia</div>
            <h3>Projeção de avanço</h3>
            <p>Leitura de progresso para o objetivo principal</p>
          </div>
        </div>
        <div class="activity-list">
          <div class="activity-item">
            <div style="flex:1;">
              <strong>Meta anual da empresa</strong>
              <div class="progress progress--green" style="margin-top:12px;"><span style="width:${data.goals[0].progress}%"></span></div>
            </div>
            <span class="timeline-item__time">${data.goals[0].progress}%</span>
          </div>
        </div>
        <div class="mini-grid">
          ${renderMiniPanel("Atingido", compactCurrency(data.goals[0].current), "Volume consolidado")}
          ${renderMiniPanel("Restante", compactCurrency(data.goals[0].target - data.goals[0].current), "Até o objetivo final")}
          ${renderMiniPanel("Prazo", data.goals[0].due, "Data limite definida")}
          ${renderMiniPanel("Fluxo de caixa", currency(financial.cashFlow), "Pulso líquido do período")}
        </div>
      </article>
    </section>
  `;
}

function renderCustos() {
  const rows = data.costs.filter((item) => matchesSearch([item.category, item.supplier, item.description, item.method]));
  const total = sum(rows, "value");
  const paid = sum(rows.filter((item) => item.status === "pago"), "value");
  const pending = rows.filter((item) => item.status === "pendente").length;
  const overdue = rows.filter((item) => item.status === "vencido").length;
  const categories = topCostCategories(rows).slice(0, 4);

  return `
    <section class="metrics-grid">
      ${renderMetricCard({ icon: "receipt", label: "Total", value: currency(total), change: "↘ 5.4%", tone: "danger" })}
      ${renderMetricCard({ icon: "check-circle", label: "Pagos", value: currency(paid), change: "↑ 12.4%", tone: "good" })}
      ${renderMetricCard({ icon: "banknote", label: "Pendentes", value: String(pending), change: "", tone: "alert" })}
      ${renderMetricCard({ icon: "alert-circle", label: "Vencidos", value: String(overdue), change: "", tone: "danger" })}
    </section>

    <section class="duo-grid">
      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Centro de custo</div>
            <h3>Distribuição por categoria</h3>
            <p>Onde o caixa está mais pressionado</p>
          </div>
        </div>
        <div class="kpi-list">
          ${categories.map((item) => renderKpiRow(item.label, currency(item.value), `${item.share}% do total filtrado`)).join("")}
        </div>
      </article>

      <article class="panel">
        <div class="section-head">
          <div>
            <div class="section-kicker">Risco de caixa</div>
            <h3>Controle diário</h3>
            <p>Prioridades do financeiro operacional</p>
          </div>
        </div>
        <div class="signal-list">
          ${renderSignalCard("Itens vencidos", String(overdue), "Despesas exigindo ação imediata", overdue ? "danger" : "good")}
          ${renderSignalCard("Pagos", currency(paid), "Volume já baixado no período", "good")}
          ${renderSignalCard("Pendências", String(pending), "Lançamentos aguardando confirmação", pending ? "alert" : "good")}
        </div>
      </article>
    </section>

    <section class="table-card">
      <div class="table-toolbar">
        <div class="table-search">
          <span data-icon="search"></span>
          <input value="${escapeHtml(searchNode.value)}" disabled />
        </div>
        <button class="button button--ghost" data-action="export-json">Exportar</button>
      </div>
      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Fornecedor</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Forma</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (item) => `
                  <tr>
                    <td><strong>${escapeHtml(item.category)}</strong></td>
                    <td>${escapeHtml(item.supplier)}</td>
                    <td>${escapeHtml(item.description)}</td>
                    <td>${currency(item.value)}</td>
                    <td>${escapeHtml(item.date)}</td>
                    <td>${escapeHtml(item.method)}</td>
                    <td>${statusBadge(item.status)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderPix() {
  const rows = data.pix.filter((item) => matchesSearch([item.alias, item.bank, item.owner, item.key]));
  return `
    <section class="metrics-grid">
      ${renderMetricCard({ icon: "wallet", label: "Chaves", value: String(data.pix.length), change: "", tone: "good" })}
      ${renderMetricCard({ icon: "repeat", label: "Em uso", value: String(rows.filter((item) => item.usage === "alto giro").length), change: "↑ 3.7%", tone: "good" })}
      ${renderMetricCard({ icon: "shield", label: "Ativas", value: String(rows.filter((item) => item.status === "ativa").length), change: "", tone: "good" })}
      ${renderMetricCard({ icon: "alert-circle", label: "Em revisão", value: String(rows.filter((item) => item.status === "revisão").length), change: "", tone: "alert" })}
    </section>

    <section class="duo-grid">
      <article class="table-card">
        <div class="section-head">
          <div>
            <h3>Cofre de chaves</h3>
            <p>Distribuição por banco e finalidade</p>
          </div>
        </div>
        <div class="timeline-feed">
          ${rows
            .map(
              (item) => `
                <div class="timeline-item">
                  <div>
                    <strong>${escapeHtml(item.alias)}</strong>
                    <div class="timeline-item__meta">${escapeHtml(item.bank)} • ${escapeHtml(item.key)}</div>
                    <div class="timeline-item__meta">${escapeHtml(item.owner)} • ${escapeHtml(item.usage)}</div>
                  </div>
                  <div class="inline-actions">
                    ${statusBadge(item.status)}
                    <button class="button button--ghost" data-copy="${escapeHtml(item.key)}">Copiar</button>
                    <button class="button button--ghost" data-toggle-pix="${item.id}">Alternar</button>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="panel">
        <div class="section-head">
          <div>
            <h3>Boas práticas</h3>
            <p>Governança interna das chaves</p>
          </div>
        </div>
        <div class="activity-list">
          ${data.pixPolicies.map((item) => `<div class="activity-item__meta">${escapeHtml(item)}</div>`).join("")}
        </div>
      </article>
    </section>
  `;
}

function renderRemessas() {
  const rows = data.remessas.filter((item) =>
    matchesSearch([item.id, item.operator, item.network, item.platform, item.status, item.source, item.target])
  );
  const completed = rows.filter((item) => item.status === "concluida");
  const processing = rows.filter((item) => item.status === "processando");
  const topRemessa = [...rows].sort((a, b) => b.value - a.value)[0];

  return `
    <section class="metrics-grid">
      ${renderMetricCard({ icon: "repeat", label: "Total", value: String(rows.length), change: "", tone: "good" })}
      ${renderMetricCard({ icon: "check-circle", label: "Concluídas", value: String(rows.filter((item) => item.status === "concluida").length), change: "↑ 11.2%", tone: "good" })}
      ${renderMetricCard({ icon: "clock", label: "Em trabalho", value: String(rows.filter((item) => item.status === "processando").length), change: "", tone: "alert" })}
      ${renderMetricCard({ icon: "banknote", label: "Volume", value: compactCurrency(sum(rows, "value")), change: "↑ 7.6%", tone: "good" })}
    </section>

    <section class="table-card">
      <div class="table-toolbar">
        <div class="table-search">
          <span data-icon="search"></span>
          <input value="${escapeHtml(searchNode.value)}" disabled />
        </div>
        <button class="button button--ghost" data-action="export-json">Exportar</button>
      </div>
      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Operador</th>
              <th>Rede</th>
              <th>Plataforma</th>
              <th>Valor</th>
              <th>ROI</th>
              <th>Status</th>
              <th>Origem</th>
              <th>Destino</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (item) => `
                  <tr>
                    <td><strong>${escapeHtml(item.id)}</strong></td>
                    <td>${escapeHtml(item.operator)}</td>
                    <td>${escapeHtml(item.network)}</td>
                    <td>${escapeHtml(item.platform)}</td>
                    <td class="money-green">${currency(item.value)}</td>
                    <td>${item.roi}%</td>
                    <td>${statusBadge(item.status)}</td>
                    <td>${escapeHtml(item.source)}</td>
                    <td>${escapeHtml(item.target)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderRelatorios() {
  return `
    <section class="report-grid">
      ${data.reports
        .map(
          (item, index) => `
            <article class="report-card">
              <span class="report-card__tag">Relatório ${index + 1}</span>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.body)}</p>
              <button class="button button--primary" data-action="export-json">Exportar base</button>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderInsightPill(label, value, note) {
  return `
    <article class="insight-pill">
      <span>${label}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </article>
  `;
}

function renderSignalCard(label, value, note, tone = "good") {
  return `
    <article class="signal-card signal-card--${tone}">
      <span>${label}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </article>
  `;
}

function renderMiniPanel(label, value, note) {
  return `
    <article class="mini-panel">
      <span>${label}</span>
      <strong class="mini-panel__value">${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </article>
  `;
}

function renderKpiRow(label, value, note) {
  return `
    <div class="kpi-row">
      <div>
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(note)}</small>
      </div>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function createOperator() {
  const firstNames = ["Renan", "Thiago", "Vitória", "Larissa", "Diego", "Matheus", "Bianca", "Samuel"];
  const lastNames = ["Pereira", "Melo", "Alves", "Rocha", "Santos", "Ribeiro", "Lima", "Silva"];
  const cities = ["Fortaleza/CE", "Recife/PE", "Salvador/BA", "Natal/RN", "Maceió/AL"];
  const networks = data.networks.length ? data.networks : [{ name: "Alpha Network" }];
  const platforms = data.platforms.length ? data.platforms : [{ name: "Fortuna Pro" }];
  const managers = data.managers.length ? data.managers : [{ name: "Daniel Bomfim" }];

  const name = `${randomFrom(firstNames)} ${randomFrom(lastNames)}`;
  const network = randomFrom(networks);
  const platform = randomFrom(platforms);
  const manager = randomFrom(managers);
  const id = `OP-${2000 + data.operators.length}`;

  data.operators.unshift({
    id,
    name,
    manager: manager.name,
    network: network.name,
    platform: platform.name,
    status: "online",
    goalPct: 52 + (data.operators.length % 45),
    profit: 2800 + data.operators.length * 940,
    roi: 35 + data.operators.length * 6,
    lastSeen: "agora",
    city: randomFrom(cities),
  });

  pushActivity("Novo operador", `${name} entrou na base ${network.name}.`, "agora");
  pushTimeline("operador", `Operador ${name} cadastrado`, `${network.name} • Plataforma ${platform.name}`, `${manager.name} • Gerente`, "AGORA");
  persistData();
  showToast(`Operador ${name} criado localmente.`, "good");
}

function createManager() {
  const firstNames = ["Caio", "Isabela", "Paulo", "Nicolas", "Amanda", "Joana"];
  const lastNames = ["Torres", "Moura", "Neves", "Campos", "Ferreira", "Costa"];
  const roles = ["Operações", "Financeiro", "Growth", "Estratégia", "Comercial"];
  const name = `${randomFrom(firstNames)} ${randomFrom(lastNames)}`;
  const id = `GER-${1000 + data.managers.length}`;

  data.managers.unshift({
    id,
    name,
    role: randomFrom(roles),
    email: `${slug(name)}@gscontrol.com`,
    team: 6 + (data.managers.length % 15),
    profit: 90000 + data.managers.length * 17000,
    status: "ativo",
  });

  pushActivity("Novo gerente", `${name} assumiu uma nova frente operacional.`, "agora");
  pushTimeline("edição", `Gerente ${name} cadastrado`, `Nova liderança vinculada ao núcleo GS`, "Sistema GS", "AGORA");
  persistData();
  showToast(`Gerente ${name} criado localmente.`, "good");
}

function createNetwork() {
  const baseNames = ["Atlas", "Pulse", "Vertex", "Nova", "Helix", "Sigma"];
  const name = `${randomFrom(baseNames)} Network`;
  const code = `RED-${100 + data.networks.length}`;
  const mark = name.charAt(0).toUpperCase();
  const palette = [
    "linear-gradient(145deg,#5a8dff,#4077ef)",
    "linear-gradient(145deg,#24d38d,#13946f)",
    "linear-gradient(145deg,#f2b31a,#c78d08)",
    "linear-gradient(145deg,#9d67ff,#6c46d9)",
  ];

  data.networks.unshift({
    code,
    name,
    mark,
    status: "ativa",
    profit: 180000 + data.networks.length * 24000,
    roi: 180 + data.networks.length * 12,
    operators: 8 + data.networks.length,
    goalPct: 58 + (data.networks.length % 36),
    performance: 61 + (data.networks.length % 24),
    color: randomFrom(palette),
  });

  pushActivity("Nova rede", `${name} entrou no mapa operacional.`, "agora");
  pushTimeline("edição", `Rede ${name} criada`, `Cluster ${code} adicionado ao controle`, "Sistema GS", "AGORA");
  persistData();
  showToast(`Rede ${name} criada localmente.`, "good");
}

function createPlatform() {
  const names = ["OrbitPlay", "CrystalBet", "FalconWin", "PrimeRoll", "StormX"];
  const categories = ["Slots", "Cassino", "Poker", "Live", "Esportes"];
  const network = data.networks.length ? randomFrom(data.networks) : { name: "Alpha Network" };
  const name = randomFrom(names);

  data.platforms.unshift({
    name,
    domain: `https://${slug(name)}.io`,
    network: network.name,
    category: randomFrom(categories),
    operators: 4 + (data.platforms.length % 18),
    profit: 64000 + data.platforms.length * 14000,
    goalPct: 42 + (data.platforms.length % 48),
    status: "ativa",
  });

  pushActivity("Nova plataforma", `${name} conectada em ${network.name}.`, "agora");
  pushTimeline("edição", `Plataforma ${name} adicionada`, `${network.name} • nova integração operacional`, "Sistema GS", "AGORA");
  persistData();
  showToast(`Plataforma ${name} criada localmente.`, "good");
}

function createPixKey() {
  const banks = ["Nubank", "Inter", "Santander", "Itaú", "Mercado Pago"];
  const alias = `Conta apoio ${data.pix.length + 1}`;
  const key = `${Date.now()}@gscontrol.local`;

  data.pix.unshift({
    id: `pix-${Date.now()}`,
    alias,
    key,
    bank: randomFrom(banks),
    owner: data.profile.owner,
    usage: data.pix.length % 2 === 0 ? "alto giro" : "contingência",
    status: "ativa",
  });

  pushActivity("Nova chave PIX", `${alias} adicionada ao cofre local.`, "agora");
  pushTimeline("pix", `Chave ${alias} cadastrada`, `Nova rota PIX criada para suporte operacional`, data.profile.owner, "AGORA");
  persistData();
  showToast(`Chave PIX ${alias} criada localmente.`, "good");
}

function pushActivity(title, description, time) {
  data.activity.unshift({ title, description, time });
  data.activity = data.activity.slice(0, 8);
}

function pushTimeline(type, title, subtitle, author, time) {
  data.timeline.unshift({ type, title, subtitle, author, time });
  data.timeline = data.timeline.slice(0, 18);
}

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function renderMetricCard({ icon, label, value, change, tone, spark = [], sparkColor = "#4d8dff" }) {
  return `
    <article class="metric-card">
      <div class="metric-card__head">
        <div class="metric-card__icon">${iconMarkup(icon)}</div>
        ${change ? `<span class="metric-card__change ${tone === "danger" ? "money-red" : "money-green"}">${change}</span>` : `<span></span>`}
      </div>
      <span class="metric-card__label">${label}</span>
      <strong class="metric-card__value">${value}</strong>
      ${spark.length ? `<div class="metric-card__spark">${sparkline(spark, sparkColor)}</div>` : ""}
    </article>
  `;
}

function renderNetworkCard(item) {
  return `
    <article class="network-card">
      <div class="network-card__top">
        <div class="person-cell">
          <div class="network-mark" style="background:${item.color}">${item.mark}</div>
          <div class="person-meta">
            <strong class="network-card__title">${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(item.code)}</small>
          </div>
        </div>
        ${statusBadge(item.status)}
      </div>
      <div class="network-card__meta">
        <div>
          <span>Lucro</span>
          <strong>${compactCurrency(item.profit)}</strong>
        </div>
        <div>
          <span>ROI</span>
          <strong>${item.roi}%</strong>
        </div>
        <div>
          <span>OPS</span>
          <strong>${item.operators}</strong>
        </div>
      </div>
      <div>
        <div class="status-row">
          <span class="subtle">Meta</span>
          <strong>${item.goalPct}%</strong>
        </div>
        <div class="progress ${item.goalPct >= 90 ? "progress--green" : ""}" style="margin-top:8px;">
          <span style="width:${item.goalPct}%"></span>
        </div>
      </div>
      <div class="network-card__footer">Performance ${item.performance}%</div>
    </article>
  `;
}

function renderGoalCard(item) {
  return `
    <article class="goal-card">
      <div class="goal-card__top">
        <div>
          <strong class="goal-card__title">${escapeHtml(item.title)}</strong>
          <div class="timeline-item__meta">Responsável • ${escapeHtml(item.owner)}</div>
        </div>
        ${item.status === "concluída" ? statusBadge("concluída") : ""}
      </div>
      <div class="goal-card__value">
        <strong>${formatGoalValue(item)}</strong>
        <span class="subtle">/ ${formatGoalTarget(item)}</span>
      </div>
      <div class="progress ${item.progress >= 90 ? "progress--green" : ""}">
        <span style="width:${item.progress}%"></span>
      </div>
      <div class="goal-card__footer">Prazo • ${escapeHtml(item.due)} • ${item.progress}%</div>
    </article>
  `;
}

function todayMetric(label, value, delta) {
  return `
    <div class="activity-item">
      <div>
        <div class="timeline-item__meta">${label}</div>
        <strong>${value}</strong>
      </div>
      <span class="money-green">${delta}</span>
    </div>
  `;
}

function funnelRow(label, value, pct, tone = "blue") {
  return `
    <div class="funnel-item">
      <div class="status-row">
        <span class="subtle">${label}</span>
        <strong class="${tone === "good" ? "money-green" : ""}">${value}</strong>
      </div>
      <div class="progress ${tone === "good" ? "progress--green" : ""}">
        <span style="width:${pct}%"></span>
      </div>
    </div>
  `;
}

function rowAction(name) {
  const labels = {
    view: "Ver",
    edit: "Editar",
    pause: "Pausar",
    delete: "Excluir",
  };
  return `<button class="button button--ghost" data-row-action="${name}">${labels[name]}</button>`;
}

function rangeOption(value) {
  return `<button class="${ui.range === value ? "is-active" : ""}" data-range="${value}">${labelRange(value)}</button>`;
}

function statusBadge(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "online" || normalized === "ativo" || normalized === "ativa" || normalized === "concluída" || normalized === "concluida" || normalized === "pago") {
    return `<span class="status-badge status-badge--good">${status}</span>`;
  }
  if (normalized === "trabalhando" || normalized === "processando" || normalized === "pendente" || normalized === "revisão" || normalized === "revisao" || normalized === "pausada" || normalized === "pausa") {
    return `<span class="status-badge status-badge--alert">${status}</span>`;
  }
  return `<span class="status-badge status-badge--danger">${status}</span>`;
}

function getFinancialSummary() {
  const revenue = sum(data.history.revenue);
  const costs = sum(data.history.costs);
  const profit = revenue - costs;
  const balance = revenue - costs * 0.6;
  const reserve = Math.round(profit * 0.17);
  const cashFlow = Math.round(profit * 0.1);
  const todayRevenue = data.history.revenue.at(-1) || 0;
  const todayProfit = data.history.profit.at(-1) || 0;
  return {
    revenue,
    costs,
    profit,
    margin: revenue ? round((profit / revenue) * 100, 1) : 0,
    roi: round((profit / Math.max(costs, 1)) * 100, 1),
    balance,
    reserve,
    cashFlow,
    todayRevenue,
    todayProfit,
    conversion: 25.4,
  };
}

function drawCharts() {
  if (ui.section === "dashboard") {
    drawMultiLineChart("dashboard-chart", getRangeHistory(), [
      { key: "revenue", color: "#2f7fff", fill: "rgba(47,127,255,0.12)" },
      { key: "profit", color: "#29d467", fill: "rgba(41,212,103,0.11)" },
      { key: "costs", color: "#f2b11b", fill: "rgba(242,177,27,0.08)" },
    ]);
  }

  if (ui.section === "financeiro") {
    drawMultiLineChart("finance-chart", getRangeHistory(), [
      { key: "revenue", color: "#2f7fff", fill: "rgba(47,127,255,0.12)" },
      { key: "profit", color: "#29d467", fill: "rgba(41,212,103,0.11)" },
      { key: "costs", color: "#ef4444", fill: "rgba(239,68,68,0.08)" },
    ]);
  }
}

function drawMultiLineChart(id, history, series) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.setLineDash([4, 6]);
  for (let i = 0; i < 4; i += 1) {
    const y = 40 + i * 70;
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const values = series.flatMap((line) => history[line.key]);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const labels = history.labels;
  const stepX = (width - 110) / Math.max(labels.length - 1, 1);

  series.forEach((line) => {
    const points = history[line.key].map((value, index) => {
      const x = 60 + index * stepX;
      const normalized = (value - min) / Math.max(max - min, 1);
      const y = height - 52 - normalized * (height - 110);
      return { x, y };
    });

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i += 1) {
      const current = points[i];
      const next = points[i + 1];
      const cx = (current.x + next.x) / 2;
      ctx.bezierCurveTo(cx, current.y, cx, next.y, next.x, next.y);
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = line.color;
    ctx.shadowColor = line.color;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - 50);
    ctx.lineTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i += 1) {
      const current = points[i];
      const next = points[i + 1];
      const cx = (current.x + next.x) / 2;
      ctx.bezierCurveTo(cx, current.y, cx, next.y, next.x, next.y);
    }
    ctx.lineTo(points.at(-1).x, height - 50);
    ctx.closePath();
    ctx.fillStyle = line.fill;
    ctx.fill();
  });

  ctx.fillStyle = "rgba(138,143,158,0.9)";
  ctx.font = "12px Inter";
  labels.forEach((label, index) => {
    const x = 60 + index * stepX;
    ctx.fillText(label, x - 10, height - 20);
  });
}

function sparkline(values, color) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const width = 220;
  const height = 44;
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values
    .map((value, index) => {
      const x = index * stepX;
      const normalized = (value - min) / Math.max(max - min, 1);
      const y = height - normalized * (height - 6) - 2;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill-${slug(color)}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.25"></stop>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <path d="${points}" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;
}

function paintStaticIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    mountIcon(node, node.dataset.icon);
  });
}

function paintDynamicIcons() {
  content.querySelectorAll("[data-icon]").forEach((node) => {
    mountIcon(node, node.dataset.icon);
  });
}

function mountIcon(node, name) {
  node.innerHTML = iconMarkup(name);
  normalizeSvgIcon(node.querySelector("svg"));
}

function normalizeSvgIcon(svg) {
  if (!svg) return;
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.9");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  svg.querySelectorAll("*").forEach((child) => {
    child.setAttribute("fill", "none");
    child.setAttribute("stroke", "currentColor");
    child.setAttribute("stroke-width", "1.9");
    child.setAttribute("stroke-linecap", "round");
    child.setAttribute("stroke-linejoin", "round");
  });
}

function iconMarkup(name) {
  const icons = {
    dashboard: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    sun: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`,
    activity: `<svg viewBox="0 0 24 24"><path d="M3 12h4l3-8 4 16 3-8h4"></path></svg>`,
    star: `<svg viewBox="0 0 24 24"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9"></polygon></svg>`,
    users: `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    "user-cog": `<svg viewBox="0 0 24 24"><circle cx="8" cy="7" r="4"></circle><path d="M2 21v-2a4 4 0 0 1 4-4h4"></path><circle cx="18" cy="17" r="3"></circle><path d="m18 12 .7 1.4 1.6.2-1.1 1.1.2 1.6-1.4-.7-1.4.7.2-1.6-1.1-1.1 1.6-.2z"></path></svg>`,
    network: `<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"></circle><circle cx="5" cy="19" r="2"></circle><circle cx="19" cy="19" r="2"></circle><path d="M12 7v4"></path><path d="M7 17l4-4"></path><path d="M17 17l-4-4"></path></svg>`,
    layers: `<svg viewBox="0 0 24 24"><path d="m12 2 9 4.5-9 4.5-9-4.5z"></path><path d="m3 12 9 4.5 9-4.5"></path><path d="m3 17 9 4.5 9-4.5"></path></svg>`,
    target: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1"></circle></svg>`,
    banknote: `<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01"></path><path d="M18 12h.01"></path></svg>`,
    receipt: `<svg viewBox="0 0 24 24"><path d="M4 3h16v18l-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path><path d="M8 15h5"></path></svg>`,
    wallet: `<svg viewBox="0 0 24 24"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"></path><path d="M22 12h-8"></path><path d="M18 9v6"></path></svg>`,
    repeat: `<svg viewBox="0 0 24 24"><path d="m17 2 4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="m7 22-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`,
    chart: `<svg viewBox="0 0 24 24"><path d="M3 3v18h18"></path><path d="m7 14 4-4 3 3 5-7"></path></svg>`,
    bell: `<svg viewBox="0 0 24 24"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5"></path><path d="M10 21a2 2 0 0 0 4 0"></path></svg>`,
    moon: `<svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"></path></svg>`,
    search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.35-4.35"></path></svg>`,
    globe: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15 15 0 0 1 0 20"></path><path d="M12 2a15 15 0 0 0 0 20"></path></svg>`,
    message: `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
    calendar: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path></svg>`,
    "chart-up": `<svg viewBox="0 0 24 24"><path d="M3 17 9 11 13 15 21 7"></path><path d="M14 7h7v7"></path></svg>`,
    percent: `<svg viewBox="0 0 24 24"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>`,
    "check-circle": `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path></svg>`,
    clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>`,
    shield: `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    "alert-circle": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    "chevrons-left": `<svg viewBox="0 0 24 24"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>`,
  };

  return icons[name] || "";
}

function submitCost(event) {
  event.preventDefault();
  data.costs.unshift({
    id: `cost-${Date.now()}`,
    category: document.querySelector("#cost-type").value,
    supplier: document.querySelector("#cost-supplier").value.trim(),
    value: Number(document.querySelector("#cost-value").value),
    date: document.querySelector("#cost-date").value,
    method: document.querySelector("#cost-method").value,
    status: document.querySelector("#cost-status").value,
    description: document.querySelector("#cost-note").value.trim() || "Sem descrição adicional",
  });
  persistData();
  closeDialog("cost-dialog");
  event.target.reset();
  showToast("Novo custo salvo com sucesso.", "good");
  render();
}

function submitRemessa(event) {
  event.preventDefault();
  data.remessas.unshift({
    id: document.querySelector("#remessa-id").value.trim(),
    operator: document.querySelector("#remessa-operator").value.trim(),
    network: document.querySelector("#remessa-network").value.trim(),
    platform: document.querySelector("#remessa-platform").value.trim(),
    value: Number(document.querySelector("#remessa-value").value),
    status: document.querySelector("#remessa-status").value,
    source: document.querySelector("#remessa-source").value.trim(),
    target: document.querySelector("#remessa-target").value.trim(),
    date: document.querySelector("#remessa-date").value,
    roi: Number(document.querySelector("#remessa-roi").value),
    note: document.querySelector("#remessa-note").value.trim() || "Sem observação",
  });
  persistData();
  closeDialog("remessa-dialog");
  event.target.reset();
  showToast("Nova operação registrada com sucesso.", "good");
  render();
}

function fillRemessaDefaults() {
  document.querySelector("#remessa-id").value = nextRemessaId();
  document.querySelector("#remessa-date").value = today();
}

function importJson(event) {
  const [file] = event.target.files;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed.version) throw new Error("invalid");
      data = parsed;
      persistData();
      showToast("Base importada com sucesso.", "good");
      render();
    } catch {
      showToast("Não foi possível importar esse arquivo.", "danger");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

async function resetData() {
  const response = await fetch("data/seed.json");
  data = await response.json();
  persistData();
  showToast("Base restaurada para o modelo inicial.", "alert");
  render();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "gs-control-cpa-data.json";
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Base exportada em JSON.", "good");
}

function openDialog(id) {
  if (id === "cost-dialog") {
    document.querySelector("#cost-date").value = today();
  }
  document.getElementById(id).showModal();
}

function closeDialog(id) {
  document.getElementById(id).close();
}

function showToast(message, tone = "good") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${tone}`;
  toast.textContent = message;
  toastRegion.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function getRangeHistory() {
  const map = {
    "7d": 7,
    "30d": data.history.labels.length,
    "90d": data.history.labels.length,
    "12m": data.history.labels.length,
  };
  const size = map[ui.range] || data.history.labels.length;
  const start = Math.max(0, data.history.labels.length - size);
  return {
    labels: data.history.labels.slice(start),
    revenue: data.history.revenue.slice(start),
    profit: data.history.profit.slice(start),
    costs: data.history.costs.slice(start),
  };
}

function sum(items, key) {
  if (!Array.isArray(items)) return 0;
  if (!key) return items.reduce((acc, item) => acc + item, 0);
  return items.reduce((acc, item) => acc + Number(item[key] || 0), 0);
}

function average(items, key) {
  return items.length ? sum(items, key) / items.length : 0;
}

function percent(part, total) {
  if (!total) return 0;
  return ((part / total) * 100).toFixed(1);
}

function topCostCategories(items) {
  const grouped = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.value || 0);
    return acc;
  }, {});

  const total = Object.values(grouped).reduce((acc, value) => acc + value, 0);

  return Object.entries(grouped)
    .map(([label, value]) => ({
      label,
      value,
      share: percent(value, total),
    }))
    .sort((a, b) => b.value - a.value);
}

function currency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function compactCurrency(value) {
  if (value >= 1000000) return `${currency(value / 1000000).replace("R$", "R$ ")}M`;
  if (value >= 1000) return `${currency(value / 1000).replace("R$", "R$ ")}k`;
  return currency(value);
}

function formatGoalValue(item) {
  return item.kind === "percent" ? `${item.current}` : compactPlain(item.current);
}

function formatGoalTarget(item) {
  return item.kind === "percent" ? `${item.target}` : compactPlain(item.target);
}

function compactPlain(value) {
  if (value >= 1000000) return `${Math.round(value / 10000) / 100}M`;
  if (value >= 1000) return `${Math.round(value / 10) / 100}k`;
  return String(value);
}

function labelRange(value) {
  return {
    "7d": "7D",
    "30d": "30 dias",
    "90d": "90D",
    "12m": "12M",
  }[value] || "30 dias";
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function nextRemessaId() {
  const max = data.remessas.reduce((acc, item) => {
    const value = Number(String(item.id).replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(acc, value) : acc;
  }, 4820);
  return `REM-${max + 1}`;
}

function normalizeStatus(value) {
  return String(value).toLowerCase();
}

function normalizeTimelineFilter(value) {
  return String(value).toLowerCase();
}

function matchesSearch(fields) {
  if (!ui.search) return true;
  return fields.some((field) => String(field).toLowerCase().includes(ui.search));
}

function initials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function round(value, digits = 0) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function slug(value) {
  return value.replace(/[^a-z0-9]/gi, "");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
