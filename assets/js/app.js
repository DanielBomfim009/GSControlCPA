const STORAGE_KEY = "gs-control-cpa-local-v1";

const ui = {
  section: "dashboard",
  operatorsTab: "ranking",
  billingTab: "overview",
  billingRange: "30d",
};

let data = null;

const pageMeta = {
  dashboard: {
    title: "Dashboard",
    description: "Leitura geral da sua operacao com foco em metas, ritmo e previsao.",
  },
  operadores: {
    title: "Operadores",
    description: "Ranking, equipe, folha de pagamento e configuracoes da operacao.",
  },
  redes: {
    title: "Redes",
    description: "Score, eficiencia e recomendacoes para cada rede monitorada.",
  },
  faturamento: {
    title: "Faturamento",
    description: "Receita consolidada, evolucao temporal e historico operacional.",
  },
  custos: {
    title: "Custos",
    description: "Controle de proxy, SMS, bot, VPS e outros custos da operacao.",
  },
  pix: {
    title: "Chaves PIX",
    description: "Modulo reservado para distribuicao de chaves e controles financeiros.",
  },
  afiliados: {
    title: "Afiliados",
    description: "Espaco para parceiros, referencias e acompanhamento externo.",
  },
  assinatura: {
    title: "Assinatura",
    description: "Area para configuracoes de acesso, assinatura e governanca do painel.",
  },
};

const content = document.querySelector("#app-content");
const pageTitle = document.querySelector("#page-title");
const pageDescription = document.querySelector("#page-description");
const bannerTitle = document.querySelector("#banner-title");
const bannerSubtitle = document.querySelector("#banner-subtitle");

async function init() {
  await loadData();
  attachGlobalEvents();
  render();
  registerServiceWorker();
}

async function loadData() {
  const persisted = localStorage.getItem(STORAGE_KEY);
  if (persisted) {
    data = JSON.parse(persisted);
    return;
  }

  const response = await fetch("data/seed.json");
  data = await response.json();
  persist();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function attachGlobalEvents() {
  document.addEventListener("click", handleClick);
  document.querySelector("#cost-form").addEventListener("submit", submitCost);
  document.querySelector("#remessa-form").addEventListener("submit", submitRemessa);
  document.querySelector("#import-button").addEventListener("click", () => {
    document.querySelector("#import-input").click();
  });
  document.querySelector("#import-input").addEventListener("change", importJson);
  document.querySelector("#export-button").addEventListener("click", exportJson);
  document.querySelector("#reset-button").addEventListener("click", resetData);
  document.querySelector("#open-cost-modal").addEventListener("click", () => openDialog("cost-dialog"));
  document.querySelector("#open-remessa-modal").addEventListener("click", () => {
    document.querySelector("#remessa-id").value = nextRemessaId();
    document.querySelector("#remessa-date").value = today();
    openDialog("remessa-dialog");
  });
}

function handleClick(event) {
  const target = event.target.closest("[data-section], [data-tab], [data-range], [data-close-dialog], [data-action], [data-remove-cost], [data-copy-invite]");
  if (!target) return;

  if (target.dataset.section) {
    ui.section = target.dataset.section;
    render();
    return;
  }

  if (target.dataset.tab) {
    const [scope, value] = target.dataset.tab.split(":");
    if (scope === "operators") ui.operatorsTab = value;
    if (scope === "billing") ui.billingTab = value;
    render();
    return;
  }

  if (target.dataset.range) {
    ui.billingRange = target.dataset.range;
    render();
    return;
  }

  if (target.dataset.closeDialog) {
    closeDialog(target.dataset.closeDialog);
    return;
  }

  if (target.dataset.action === "open-cost") {
    openDialog("cost-dialog");
    return;
  }

  if (target.dataset.removeCost) {
    data.costs = data.costs.filter((item) => item.id !== target.dataset.removeCost);
    persist();
    render();
    return;
  }

  if (target.dataset.copyInvite) {
    const invite = data.invites.find((item) => item.id === target.dataset.copyInvite);
    if (invite) navigator.clipboard?.writeText(invite.code);
    return;
  }
}

function render() {
  updateShell();
  renderSection();
  setActiveSidebar();
}

function updateShell() {
  const meta = pageMeta[ui.section];
  pageTitle.textContent = meta.title;
  pageDescription.textContent = meta.description;
  bannerTitle.textContent = `${data.brand.name} Operacional`;
  bannerSubtitle.textContent = data.brand.tagline;
}

function setActiveSidebar() {
  document.querySelectorAll(".side-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.section === ui.section);
  });
}

function renderSection() {
  switch (ui.section) {
    case "dashboard":
      content.innerHTML = renderDashboard();
      drawDashboardCharts();
      break;
    case "operadores":
      content.innerHTML = renderOperators();
      break;
    case "redes":
      content.innerHTML = renderNetworks();
      break;
    case "faturamento":
      content.innerHTML = renderBilling();
      drawBillingCharts();
      break;
    case "custos":
      content.innerHTML = renderCosts();
      break;
    default:
      content.innerHTML = renderPlaceholder();
  }
}

function renderDashboard() {
  const summary = getSummary();
  const targetPct = Math.min(100, Math.round((summary.todayProfit / data.goals.daily) * 100));

  return `
    <section class="hero-card">
      <div class="stack-row">
        <div>
          <div class="stack-row">
        <strong class="stat-value">${escapeHtml(data.profile.owner)}</strong>
            <span class="status-chip status-chip--good">Saudavel</span>
            <span class="status-chip status-chip--pending">Trial 3 dias</span>
          </div>
        <p class="muted">Dados em tempo real, protegidos localmente e prontos para GitHub Pages.</p>
        </div>
        <button class="ghost-button">Atualizar leitura</button>
      </div>
    </section>

    <section class="goal-strip">
      <div class="goal-strip__icon">GO</div>
      <div>
        <p class="card-eyebrow">Meta do dia</p>
        <div class="stack-row">
          <strong class="money">${formatBRL(summary.todayProfit)}</strong>
          <span class="muted">de ${formatBRL(data.goals.daily)}</span>
        </div>
        <p class="muted">Faltam ${formatBRL(Math.max(0, data.goals.daily - summary.todayProfit))} para bater hoje.</p>
        <div class="progress"><span style="width:${targetPct}%"></span></div>
      </div>
      <div>
        <strong class="stat-value">${targetPct}%</strong>
        <span class="muted">do alvo diario</span>
      </div>
    </section>

    <section class="quad-grid">
      ${metricCard("Lucro de julho", formatBRL(summary.monthProfit), "money money--good")}
      ${metricCard("Remessas no sistema", String(data.remessas.length), "stat-value")}
      ${metricCard("Operadores ativos", String(summary.activeOperators), "stat-value")}
      ${metricCard("Metas fechadas", String(summary.closedGoals), "stat-value")}
    </section>

    <section class="dashboard-grid">
      <article class="chart-shell">
        <p class="card-eyebrow">Lucro - julho</p>
        <strong class="money money--good">${formatBRL(summary.monthProfit)}</strong>
        <div class="small-grid" style="margin-top:18px;">
          <div><span class="mini-label">Metas fechadas</span><strong>${summary.closedGoals}</strong></div>
          <div><span class="mini-label">Operadores</span><strong>${data.operators.length}</strong></div>
          <div><span class="mini-label">Lucro apos custos</span><strong class="money--good">${formatBRL(summary.netProfit)}</strong></div>
        </div>
        <canvas id="dashboard-profit-chart" width="840" height="260"></canvas>
      </article>

      <article class="chart-shell chart-shell--small">
        <div class="section-header">
          <div>
            <p class="card-eyebrow">Funil da operacao</p>
            <h2 class="section-title">Visao consolidada do sistema</h2>
          </div>
        </div>
        <div class="funnel-list">
          ${funnelStep("Lucro total na plataforma", formatBRL(summary.monthProfit))}
          ${funnelStep("Lucro do dia", formatBRL(summary.todayProfit))}
          ${funnelStep("Contas no sistema", String(summary.totalAccounts))}
          ${funnelStep("Remessas no sistema", String(data.remessas.length))}
          ${funnelStep("Metas no sistema", String(data.goals.closed))}
        </div>
      </article>
    </section>

    <section class="banner-note">
      Media de ${formatBRL(summary.avgPerAccount)}/conta com risco operacional ${summary.risk}.
    </section>

    <section class="dual-grid">
      <article class="card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Leitura da operacao</h2>
            <p class="section-copy">Resumo critico para decisao rapida.</p>
          </div>
          <span class="status-chip status-chip--good">Crescimento</span>
        </div>
        <div class="bullet-list">
          ${summary.insights.map((item) => `<div class="bullet-item">${escapeHtml(item)}</div>`).join("")}
        </div>
      </article>

      <article class="card card--accent">
        <div class="section-header">
          <div>
            <h2 class="section-title">Top redes performance</h2>
            <p class="section-copy">Distribuicao do lucro por rede.</p>
          </div>
        </div>
        <div class="stack-row" style="align-items:flex-end;">
          <div>
            <strong class="money">${escapeHtml(data.networks[0].name)}</strong>
            <p class="muted">${formatBRL(data.networks[0].profit)} no periodo</p>
          </div>
          <div class="sparkline">${sparkline(data.history.profit)}</div>
        </div>
      </article>
    </section>
  `;
}

function renderOperators() {
  const tab = ui.operatorsTab;
  const operatorSummary = getOperatorSummary();

  return `
    <section class="tab-strip">
      ${tabButton("operators:ranking", "Ranking", tab)}
      ${tabButton("operators:equipe", "Equipe", tab)}
      ${tabButton("operators:folha", "Folha de pagamento", tab)}
      ${tabButton("operators:config", "Configuracoes", tab)}
    </section>
    ${tab === "ranking" ? renderOperatorsRanking(operatorSummary) : ""}
    ${tab === "equipe" ? renderOperatorsTeam() : ""}
    ${tab === "folha" ? renderOperatorsPayroll() : ""}
    ${tab === "config" ? renderOperatorsConfig() : ""}
  `;
}

function renderOperatorsRanking(summary) {
  return `
    <section class="operators-grid">
      ${metricCard("Operadores", String(summary.total), "stat-value")}
      ${metricCard("Ativos", String(summary.active), "stat-value")}
      ${metricCard("Depositantes totais", String(summary.depositors), "stat-value")}
      ${metricCard("Acerto medio", `${summary.accuracy}%`, "stat-value")}
      ${metricCard("Lucro equipe", formatBRL(summary.profit), "money money--good")}
    </section>

    <section class="empty-box">Painel de metas fechadas e desempenho semanal da equipe.</section>

    <section class="dual-grid">
      <article class="card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Ranking semanal</h2>
            <p class="section-copy">Periodo 13/07/2026 a 20/07/2026</p>
          </div>
          <span class="muted">${summary.active} ativos</span>
        </div>
        <div class="operator-list">
          ${data.operators
            .slice()
            .sort((a, b) => b.profit - a.profit)
            .map(
              (item, index) => `
                <div class="operator-item">
                  <div class="list-row">
                    <strong>#${index + 1} ${escapeHtml(item.name)}</strong>
                    <span class="badge badge--good">${formatBRL(item.profit)}</span>
                  </div>
                  <span class="muted">${item.deposits} depositantes | score ${item.score}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="card card--blue">
        <div class="section-header">
          <div>
            <h2 class="section-title">Radar da equipe</h2>
            <p class="section-copy">Inteligencia de gestao em tempo real.</p>
          </div>
          <span class="status-chip status-chip--good">${summary.alerts} sinais</span>
        </div>
        <div class="bullet-list">
          <div class="bullet-item">Melhor operador atual: ${escapeHtml(summary.topOperator)}</div>
          <div class="bullet-item">Maior score de disciplina: ${summary.topScore}/100</div>
          <div class="bullet-item">Lucro medio por operador: ${formatBRL(summary.avgProfit)}</div>
        </div>
      </article>
    </section>
  `;
}

function renderOperatorsTeam() {
  return `
    <section class="invite-card card--blue">
      <div class="section-header">
        <div>
          <h2 class="section-title">Convites para operadores</h2>
          <p class="section-copy">Gere links unicos para cada novo membro da equipe.</p>
        </div>
        <span class="muted">${data.invites.length} pendentes</span>
      </div>
      <div class="actions-row" style="margin:18px 0 16px;">
        <button class="primary-button">Gerar link de convite</button>
      </div>
      <div class="invite-list">
        ${data.invites
          .map(
            (invite) => `
              <div class="invite-item">
                <strong>${escapeHtml(invite.code)}</strong>
                <div class="list-row">
                  <span class="muted">${invite.date} | ${invite.status}</span>
                  <div class="table-actions">
                    <button class="mini-button" data-copy-invite="${invite.id}">Copiar</button>
                  </div>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="card">
      <div class="section-header">
        <h2 class="section-title">Equipe (${data.operators.length})</h2>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Operador</th>
              <th>Status</th>
              <th>Rede</th>
              <th>Score</th>
              <th>Lucro</th>
            </tr>
          </thead>
          <tbody>
            ${data.operators
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${statusBadge(item.status)}</td>
                    <td>${escapeHtml(item.network)}</td>
                    <td>${item.score}</td>
                    <td class="money--good">${formatBRL(item.profit)}</td>
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

function renderOperatorsPayroll() {
  return `
    <section class="stack-row">
      ${["hoje", "7d", "30d", "tudo"]
        .map((item) => `<button class="pill-button ${ui.billingRange === item ? "is-active" : ""}" data-range="${item}">${labelRange(item)}</button>`)
        .join("")}
    </section>

    <section class="card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Modelo: R$ 2,00 por depositante</h2>
          <p class="section-copy">Folha local calculada com base na configuracao atual.</p>
        </div>
        <strong class="money money--good">${formatBRL(getPayrollTotal())}</strong>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Operador</th>
              <th>Depositantes</th>
              <th>Valor por dep</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.operators
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${item.deposits}</td>
                    <td>${formatBRL(data.settings.perDepositor)}</td>
                    <td>${formatBRL(item.deposits * data.settings.perDepositor)}</td>
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

function renderOperatorsConfig() {
  return `
    <section class="card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Modelo de operacao padrao</h2>
          <p class="section-copy">Configuracao-base para a sua operacao.</p>
        </div>
      </div>
      <div class="dual-grid">
        <div class="metric-box" style="border-color:rgba(255,42,42,0.25); background:rgba(46,12,12,0.55);">
          <strong>Salario + Bau</strong>
          <span class="muted">Com contrato de plataforma.</span>
        </div>
        <div class="metric-box">
          <strong>Apenas Bau</strong>
          <span class="muted">Sem contrato, lucro so do bau.</span>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Pagamento de operadores</h2>
        </div>
      </div>
      <div class="triple-grid">
        <div class="metric-box">
          <strong>Fixo por depositante</strong>
          <span class="muted">Ex: R$ ${data.settings.perDepositor.toFixed(2)} por dep.</span>
        </div>
        <div class="metric-box">
          <strong>% do lucro final</strong>
          <span class="muted">${data.settings.profitShare}% do lucro.</span>
        </div>
        <div class="metric-box">
          <strong>Divisao de resultado</strong>
          <span class="muted">Split entre lucro e prejuizo.</span>
        </div>
      </div>
    </section>
  `;
}

function renderNetworks() {
  const totalProfit = data.networks.reduce((sum, item) => sum + item.profit, 0);
  const avgScore = Math.round(data.networks.reduce((sum, item) => sum + item.score, 0) / data.networks.length);

  return `
    <section class="quad-grid">
      ${metricCard("Total de redes", String(data.networks.length), "stat-value")}
      ${metricCard("Redes lucrativas", String(data.networks.filter((item) => item.profit > 0).length), "stat-value")}
      ${metricCard("Lucro total", formatBRL(totalProfit), "money money--good")}
      ${metricCard("Score medio", `${avgScore}/100`, "stat-value")}
    </section>

    <section class="card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Alertas estrategicos</h2>
        </div>
      </div>
      <div class="record-list">
        ${data.networks
          .filter((item) => item.score >= 70)
          .map(
            (item) => `
              <div class="record-item">
                <strong>${escapeHtml(item.name)} em destaque</strong>
                <span class="muted">${formatBRL(item.profit)} acumulado em ${item.closedGoals} metas.</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Ranking por network score</h2>
          <p class="section-copy">${data.networks.length} redes monitoradas</p>
        </div>
      </div>
      <div class="record-list">
        ${data.networks
          .slice()
          .sort((a, b) => b.score - a.score)
          .map(
            (item, index) => `
              <div class="network-row">
                <div class="list-row">
                  <strong>#${index + 1} ${escapeHtml(item.name)}</strong>
                  <span class="badge badge--good">${formatBRL(item.profit)}</span>
                </div>
                <span class="muted">${item.closedGoals} metas | ${item.deposits} dep. | ${item.remessas} remessas</span>
                <div class="progress"><span style="width:${item.score}%"></span></div>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderBilling() {
  const tab = ui.billingTab;
  const summary = getSummary();

  return `
    <section class="tab-strip">
      ${tabButton("billing:overview", "Visao geral", tab)}
      ${tabButton("billing:evolution", "Evolucao", tab)}
      ${tabButton("billing:history", "Historico", tab)}
    </section>

    <section class="filters-row">
      ${["hoje", "ontem", "7d", "30d"].map((item) => `<button class="filter-chip ${ui.billingRange === item ? "is-active" : ""}" data-range="${item}">${labelRange(item)}</button>`).join("")}
      <button class="filter-chip">Todos operadores</button>
      <button class="filter-chip">Todas redes</button>
      <button class="filter-chip">Lucro + Prejuizo</button>
    </section>

    ${tab === "overview" ? renderBillingOverview(summary) : ""}
    ${tab === "evolution" ? renderBillingEvolution() : ""}
    ${tab === "history" ? renderBillingHistory() : ""}
  `;
}

function renderBillingOverview(summary) {
  return `
    <section class="metrics-grid">
      <article class="chart-shell card--accent">
        <p class="card-eyebrow">Receita consolidada</p>
        <strong class="money money--good">${formatBRL(summary.netProfit)}</strong>
        <p class="muted">Lucro final da operacao apos custos.</p>
        <div class="small-grid" style="margin-top:18px;">
          <div><span class="mini-label">Fechadas</span><strong>${summary.closedGoals}</strong></div>
          <div><span class="mini-label">Remessas</span><strong>${data.remessas.length}</strong></div>
          <div><span class="mini-label">Operadores</span><strong>${data.operators.length}</strong></div>
        </div>
        <canvas id="billing-overview-chart" width="860" height="240"></canvas>
      </article>

      <div class="metrics-stack">
        ${sideMetric("Lucro bruto", formatBRL(summary.monthProfit))}
        ${sideMetric("Total depositado", formatBRL(summary.totalDeposited))}
        ${sideMetric("Total sacado", formatBRL(summary.totalWithdrawn))}
        ${sideMetric("Taxa de acerto", `${getOperatorSummary().accuracy}%`)}
      </div>
    </section>

    <section class="dual-grid">
      <article class="card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Inteligencia da operacao</h2>
            <p class="section-copy">Analise de tendencia para o periodo atual.</p>
          </div>
          <span class="status-chip status-chip--good">Ao vivo</span>
        </div>
        <div class="triple-grid">
          <div class="metric-box">
            <span class="mini-label">Tendencia</span>
            <strong class="money--good">Subindo</strong>
          </div>
          <div class="metric-box">
            <span class="mini-label">Lucro final real</span>
            <strong class="money--good">${formatBRL(summary.netProfit)}</strong>
          </div>
          <div class="metric-box">
            <span class="mini-label">Alerta</span>
            <strong>Performance OK</strong>
          </div>
        </div>
      </article>

      <article class="card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Meta global</h2>
            <p class="section-copy">Objetivo ${formatBRL(data.goals.global)}</p>
          </div>
          <button class="mini-button">Editar</button>
        </div>
        <strong class="money money--good">${Math.round((summary.netProfit / data.goals.global) * 100)}%</strong>
        <div class="progress" style="margin:18px 0 18px;"><span style="width:${Math.min(100, Math.round((summary.netProfit / data.goals.global) * 100))}%"></span></div>
        <div class="triple-grid">
          ${metricCard("Atingido", formatBRL(summary.netProfit), "money money--good")}
          ${metricCard("Falta", formatBRL(Math.max(0, data.goals.global - summary.netProfit)), "stat-value")}
          ${metricCard("Previsao", `~${summary.forecastDays} dias`, "stat-value")}
        </div>
      </article>
    </section>
  `;
}

function renderBillingEvolution() {
  return `
    <section class="chart-shell">
      <div class="section-header">
        <h2 class="section-title">Evolucao do faturamento</h2>
        <div class="segmented">
          <button class="pill-button is-active">Diario</button>
          <button class="pill-button">Semanal</button>
          <button class="pill-button">Mensal</button>
        </div>
      </div>
      <canvas id="billing-evolution-chart" width="1200" height="280"></canvas>
    </section>

    <section class="chart-shell chart-shell--small">
      <h2 class="section-title">Comparativo lucro vs prejuizo</h2>
      <canvas id="billing-compare-chart" width="1200" height="220"></canvas>
    </section>
  `;
}

function renderBillingHistory() {
  return `
    <section class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Operador</th>
            <th>Valor</th>
            <th>Origem</th>
            <th>Destino</th>
            <th>Data</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.remessas
            .map(
              (item) => `
                <tr>
                  <td>${escapeHtml(item.id)}</td>
                  <td>${escapeHtml(item.operator)}</td>
                  <td>${formatBRL(item.value)}</td>
                  <td>${escapeHtml(item.source)}</td>
                  <td>${escapeHtml(item.target)}</td>
                  <td>${item.date}</td>
                  <td>${statusBadge(item.status)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderCosts() {
  const costSummary = getCostSummary();

  return `
    <section class="section-header">
      <div></div>
      <button class="ghost-button" data-action="open-cost">Adicionar custo</button>
    </section>

    <section class="costs-grid">
      ${metricCard("Custo do dia", formatBRL(costSummary.today), "money money--danger")}
      ${metricCard("Lucro vs custo (hoje)", formatBRL(costSummary.balanceToday), costSummary.balanceToday >= 0 ? "money money--good" : "money money--danger")}
      ${metricCard("Custo do mes", formatBRL(costSummary.month), "money")}
    </section>

    <section class="card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Historico de custos</h2>
          <p class="section-copy">Entenda para onde seu dinheiro esta indo.</p>
        </div>
      </div>
      ${
        data.costs.length
          ? `
            <div class="cost-list">
              ${data.costs
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(
                  (item) => `
                    <div class="cost-item">
                      <div class="list-row">
                        <strong>${escapeHtml(item.type)}</strong>
                        <div class="table-actions">
                          <span class="badge badge--danger">${formatBRL(item.value)}</span>
                          <button class="mini-button" data-remove-cost="${item.id}">Excluir</button>
                        </div>
                      </div>
                      <span class="muted">${item.date} | ${escapeHtml(item.owner)} | ${escapeHtml(item.note || "Sem observacao")}</span>
                    </div>
                  `
                )
                .join("")}
            </div>
          `
          : `
            <div class="empty-box">
              <div>
                <strong>Adicione seu primeiro custo</strong>
        <p>Abra o modal e comece a registrar proxy, SMS, bot, VPS e outras despesas.</p>
                <button class="primary-button" data-action="open-cost">Adicionar custo</button>
              </div>
            </div>
          `
      }
    </section>
  `;
}

function renderPlaceholder() {
  return `
    <section class="empty-box">
      <div>
        <strong>Modulo reservado</strong>
        <p>Esta area vai receber a proxima fase do projeto com a mesma identidade visual do GN Atlas.</p>
      </div>
    </section>
  `;
}

function metricCard(label, value, className = "stat-value") {
  return `
    <article class="card card--blue">
      <p class="card-eyebrow">${label}</p>
      <strong class="${className}">${value}</strong>
    </article>
  `;
}

function sideMetric(label, value) {
  return `
    <article class="metric-box">
      <span class="mini-label">${label}</span>
      <strong class="money">${value}</strong>
    </article>
  `;
}

function funnelStep(label, value) {
  return `
    <div class="funnel-step">
      <span class="mini-label">${label}</span>
      <strong class="money">${value}</strong>
    </div>
  `;
}

function tabButton(key, label, active) {
  const value = key.split(":")[1];
  return `<button class="tab-button ${value === active ? "is-active" : ""}" data-tab="${key}">${label}</button>`;
}

function statusBadge(status) {
  if (status === "concluida") return `<span class="badge badge--good">Concluida</span>`;
  if (status === "processando") return `<span class="badge badge--warn">Processando</span>`;
  return `<span class="badge badge--danger">Pendente</span>`;
}

function labelRange(value) {
  if (value === "hoje") return "Hoje";
  if (value === "ontem") return "Ontem";
  if (value === "7d") return "7 dias";
  if (value === "30d") return "30 dias";
  return "Tudo";
}

function getSummary() {
  const monthProfit = data.history.profit.reduce((sum, item) => sum + item, 0);
  const todayProfit = data.history.profit[data.history.profit.length - 1];
  const totalCosts = data.costs.reduce((sum, item) => sum + item.value, 0);
  const totalDeposited = data.networks.reduce((sum, item) => sum + item.deposits * 140, 0);
  const totalWithdrawn = totalDeposited - monthProfit;
  const activeOperators = data.operators.filter((item) => item.status === "ativo").length;
  const totalAccounts = data.networks.reduce((sum, item) => sum + item.accounts, 0);
  const avgPerAccount = totalAccounts ? monthProfit / totalAccounts : 0;
  const forecastDays = Math.ceil((data.goals.global - (monthProfit - totalCosts)) / Math.max(todayProfit, 1));

  return {
    monthProfit,
    todayProfit,
    netProfit: monthProfit - totalCosts,
    closedGoals: data.goals.closed,
    activeOperators,
    totalAccounts,
    avgPerAccount,
    totalDeposited,
    totalWithdrawn,
    risk: data.networks.some((item) => item.score < 60) ? "moderado" : "baixo",
    forecastDays,
    insights: [
      "Operacao estavel em relacao ao ciclo anterior.",
      `Media de ${formatBRL(monthProfit / Math.max(data.goals.closed, 1))} por meta fechada.`,
      `No ritmo atual, a meta global pode ser batida em ~${forecastDays} dias.`,
    ],
  };
}

function getOperatorSummary() {
  const total = data.operators.length;
  const active = data.operators.filter((item) => item.status === "ativo").length;
  const depositors = data.operators.reduce((sum, item) => sum + item.deposits, 0);
  const profit = data.operators.reduce((sum, item) => sum + item.profit, 0);
  const accuracy = Math.round(data.operators.reduce((sum, item) => sum + item.score, 0) / total);
  const top = data.operators.slice().sort((a, b) => b.profit - a.profit)[0];

  return {
    total,
    active,
    depositors,
    profit,
    accuracy,
    topOperator: top?.name ?? "-",
    topScore: Math.max(...data.operators.map((item) => item.score)),
    avgProfit: profit / total,
    alerts: 3,
  };
}

function getPayrollTotal() {
  return data.operators.reduce((sum, item) => sum + item.deposits * data.settings.perDepositor, 0);
}

function getCostSummary() {
  const todayValue = today();
  const monthKey = todayValue.slice(0, 7);
  const today = data.costs.filter((item) => item.date === todayValue).reduce((sum, item) => sum + item.value, 0);
  const month = data.costs.filter((item) => item.date.startsWith(monthKey)).reduce((sum, item) => sum + item.value, 0);
  const balanceToday = getSummary().todayProfit - today;
  return { today, month, balanceToday };
}

function submitCost(event) {
  event.preventDefault();
  const item = {
    id: `cost-${Date.now()}`,
    type: document.querySelector("#cost-type").value,
    value: Number(document.querySelector("#cost-value").value),
    date: document.querySelector("#cost-date").value,
    owner: document.querySelector("#cost-owner").value.trim(),
    note: document.querySelector("#cost-note").value.trim(),
  };
  data.costs.push(item);
  persist();
  closeDialog("cost-dialog");
  event.target.reset();
  render();
}

function submitRemessa(event) {
  event.preventDefault();
  const item = {
    id: document.querySelector("#remessa-id").value.trim(),
    operator: document.querySelector("#remessa-operator").value.trim(),
    value: Number(document.querySelector("#remessa-value").value),
    status: document.querySelector("#remessa-status").value,
    source: document.querySelector("#remessa-source").value.trim(),
    target: document.querySelector("#remessa-target").value.trim(),
    date: document.querySelector("#remessa-date").value,
    note: document.querySelector("#remessa-note").value.trim(),
  };
  data.remessas.unshift(item);
  persist();
  closeDialog("remessa-dialog");
  event.target.reset();
  render();
}

function importJson(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      data = JSON.parse(String(reader.result));
      persist();
      render();
      alert("Base importada com sucesso.");
    } catch {
      alert("Nao foi possivel importar o arquivo.");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

async function resetData() {
  const response = await fetch("data/seed.json");
  data = await response.json();
  persist();
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

function drawDashboardCharts() {
  drawLineChart("dashboard-profit-chart", data.history.profit, "#ff2a2a", "rgba(255,42,42,0.18)");
}

function drawBillingCharts() {
  drawLineChart("billing-overview-chart", data.history.profit, "#72ffd4", "rgba(114,255,212,0.14)");
  drawLineChart("billing-evolution-chart", data.history.profit, "#72ffd4", "rgba(114,255,212,0.1)");
  drawBarChart("billing-compare-chart", data.history.profit, "#ff2a2a");
}

function drawLineChart(id, values, stroke, fill) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.setLineDash([4, 8]);
  for (let i = 1; i < 4; i += 1) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const stepX = (width - 80) / Math.max(values.length - 1, 1);

  const pathPoints = values.map((value, index) => {
    const x = 40 + index * stepX;
    const normalized = (value - min) / Math.max(max - min, 1);
    const y = height - 40 - normalized * (height - 90);
    return { x, y };
  });

  ctx.beginPath();
  ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
  for (let index = 0; index < pathPoints.length - 1; index += 1) {
    const current = pathPoints[index];
    const next = pathPoints[index + 1];
    const controlX = (current.x + next.x) / 2;
    ctx.bezierCurveTo(controlX, current.y, controlX, next.y, next.x, next.y);
  }

  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.shadowColor = stroke;
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(pathPoints[0].x, height - 30);
  ctx.lineTo(pathPoints[0].x, pathPoints[0].y);
  for (let index = 0; index < pathPoints.length - 1; index += 1) {
    const current = pathPoints[index];
    const next = pathPoints[index + 1];
    const controlX = (current.x + next.x) / 2;
    ctx.bezierCurveTo(controlX, current.y, controlX, next.y, next.x, next.y);
  }
  ctx.lineTo(pathPoints[pathPoints.length - 1].x, height - 30);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  pathPoints.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = stroke;
    ctx.fill();
  });
}

function drawBarChart(id, values, color) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  const max = Math.max(...values, 1);
  const barWidth = (width - 120) / values.length;

  values.forEach((value, index) => {
    const barHeight = (value / max) * (height - 70);
    const x = 50 + index * barWidth;
    const y = height - 30 - barHeight;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, y, Math.max(18, barWidth - 18), barHeight);
  });

  ctx.globalAlpha = 1;
}

function nextRemessaId() {
  const max = data.remessas.reduce((acc, item) => {
    const value = Number(item.id.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(acc, value) : acc;
  }, 9500);
  return `REM-${max + 1}`;
}

function sparkline(values) {
  const max = Math.max(...values, 1);
  return values
    .map((item) => `<span style="height:${Math.max(12, Math.round((item / max) * 100))}%"></span>`)
    .join("");
}

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  } catch (error) {
    console.error(error);
  }
}

init();
