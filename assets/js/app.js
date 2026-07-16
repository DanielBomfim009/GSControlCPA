const APP_VERSION = "2026.07.gs-control-cpa.v2";
const STORAGE_KEY = "gs-control-cpa-local-v2";

const ui = {
  section: "dashboard",
  operatorsTab: "ranking",
  billingTab: "overview",
  billingRange: "30d",
};

let data = null;

const pageMeta = {
  dashboard: {
    title: "Visão geral",
    description: "Leitura tática, performance consolidada, alertas e atividade recente da operação.",
  },
  operadores: {
    title: "Operadores",
    description: "Ranking, equipe, folha, convites e políticas de atuação dos operadores.",
  },
  redes: {
    title: "Redes",
    description: "Comparativo de redes, score operacional, risco, recomendação e lucratividade.",
  },
  faturamento: {
    title: "Faturamento",
    description: "Receita, margem, evolução, histórico de remessas e leitura financeira.",
  },
  custos: {
    title: "Custos",
    description: "Controle de gastos, categorias, impacto diário e saúde do caixa operacional.",
  },
  pix: {
    title: "PIX",
    description: "Cofre interno de chaves, status de uso, vínculo por banco e governança de repasse.",
  },
  afiliados: {
    title: "Afiliados",
    description: "Parceiros estratégicos, participação, origem de tráfego e visão de relacionamento.",
  },
  assinatura: {
    title: "Governança",
    description: "Regras locais, integridade da base, modo manutenção e segurança do painel.",
  },
};

const content = document.querySelector("#app-content");
const pageTitle = document.querySelector("#page-title");
const pageDescription = document.querySelector("#page-description");
const bannerTitle = document.querySelector("#banner-title");
const bannerSubtitle = document.querySelector("#banner-subtitle");
const toastRegion = document.querySelector("#toast-region");

async function init() {
  await loadData();
  attachGlobalEvents();
  render();
  registerServiceWorker();
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
      // fallback para seed
    }
  }

  const response = await fetch("data/seed.json");
  data = await response.json();
  persist();
}

function persist() {
  data.profile.updatedAt = formatDateTime(new Date());
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
    fillRemessaDefaults();
    openDialog("remessa-dialog");
  });
}

function handleClick(event) {
  const target = event.target.closest(
    "[data-section], [data-tab], [data-range], [data-close-dialog], [data-action], [data-copy], [data-remove-cost], [data-remove-remessa], [data-toggle-pix]"
  );
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

  if (target.dataset.copy) {
    copyValue(target.dataset.copy);
    return;
  }

  if (target.dataset.removeCost) {
    data.costs = data.costs.filter((item) => item.id !== target.dataset.removeCost);
    persist();
    showToast("Custo removido da base local.", "alert");
    render();
    return;
  }

  if (target.dataset.removeRemessa) {
    data.remessas = data.remessas.filter((item) => item.id !== target.dataset.removeRemessa);
    persist();
    showToast("Operação removida do histórico local.", "alert");
    render();
    return;
  }

  if (target.dataset.togglePix) {
    const pix = data.pixKeys.find((item) => item.id === target.dataset.togglePix);
    if (!pix) return;
    pix.status = pix.status === "Ativa" ? "Em revisão" : "Ativa";
    persist();
    showToast(`Status da chave ${pix.alias} atualizado.`, "good");
    render();
    return;
  }

  if (target.dataset.action) {
    handleAction(target.dataset.action);
  }
}

function handleAction(action) {
  switch (action) {
    case "refresh":
      data.profile.updatedAt = formatDateTime(new Date());
      persist();
      showToast("Leitura da operação atualizada.", "good");
      render();
      break;
    case "open-cost":
      openDialog("cost-dialog");
      break;
    case "open-remessa":
      fillRemessaDefaults();
      openDialog("remessa-dialog");
      break;
    case "generate-invite":
      generateInvite();
      break;
    case "toggle-maintenance":
      data.governance.maintenance = !data.governance.maintenance;
      persist();
      showToast(
        data.governance.maintenance ? "Modo manutenção ativado." : "Modo manutenção desativado.",
        data.governance.maintenance ? "alert" : "good"
      );
      render();
      break;
    case "run-backup":
      data.governance.lastBackup = formatDateTime(new Date());
      persist();
      showToast("Snapshot local marcado como atualizado.", "good");
      render();
      break;
    case "raise-goal":
      data.goals.monthly += 5000;
      persist();
      showToast("Meta mensal elevada em R$ 5.000.", "good");
      render();
      break;
    default:
      break;
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
  bannerTitle.textContent = `${data.brand.name} • ${data.profile.workspace}`;
  bannerSubtitle.textContent = `${data.brand.tagline} • Atualizado em ${data.profile.updatedAt}`;
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
    case "pix":
      content.innerHTML = renderPix();
      break;
    case "afiliados":
      content.innerHTML = renderAffiliates();
      break;
    case "assinatura":
      content.innerHTML = renderGovernance();
      break;
    default:
      content.innerHTML = renderEmptyState("Módulo ainda não disponível.");
  }
}

function renderDashboard() {
  const summary = getSummary();
  const topOperator = getTopOperator();
  const topNetwork = getTopNetwork();
  const targetPct = Math.min(100, Math.round((summary.todayProfit / data.goals.daily) * 100));

  return `
    <section class="highlight-card">
      <div class="stack-row">
        <div>
          <p class="card-eyebrow">Cockpit do dia</p>
          <strong class="metric-value">${escapeHtml(data.profile.owner)}</strong>
          <p class="section-copy">Ambiente proprietário para leitura tática, decisões rápidas e gestão local da base.</p>
        </div>
        <div class="stack-row">
          ${statusPill(data.profile.status, "good")}
          ${statusPill(summary.riskLabel, summary.riskTone)}
          ${statusPill(`${summary.activeOperators} ativos`, "good")}
        </div>
      </div>
    </section>

    <section class="goal-panel">
      <div class="goal-panel__icon">GS</div>
      <div>
        <p class="card-eyebrow">Meta diária</p>
        <div class="stack-row">
          <strong class="money-value">${formatBRL(summary.todayProfit)}</strong>
          <span class="muted">de ${formatBRL(data.goals.daily)}</span>
        </div>
        <p class="section-copy">Faltam ${formatBRL(Math.max(0, data.goals.daily - summary.todayProfit))} para fechar o alvo de hoje.</p>
        <div class="progress"><span style="width:${targetPct}%"></span></div>
      </div>
      <div>
        <strong class="metric-value">${targetPct}%</strong>
        <span class="muted">do objetivo</span>
      </div>
    </section>

    <section class="quad-grid">
      ${statCard("Lucro líquido do período", formatBRL(summary.netProfit), "money-value money-value--mint")}
      ${statCard("Receita bruta", formatBRL(summary.revenueTotal), "money-value")}
      ${statCard("Margem operacional", `${summary.margin}%`, "metric-value")}
      ${statCard("Remessas concluídas", String(summary.completedRemessas), "metric-value")}
    </section>

    <section class="two-column">
      <article class="chart-card">
        <div class="section-header">
          <div>
            <p class="card-eyebrow">Curva operacional</p>
            <h2 class="section-title">Lucro, receita e custo da janela ativa</h2>
          </div>
          <div class="toolbar">
            ${rangeButton("7d")}
            ${rangeButton("30d")}
            ${rangeButton("all")}
          </div>
        </div>
        <div class="small-grid" style="margin-top:18px;">
          ${microStat("Melhor operador", topOperator.name)}
          ${microStat("Melhor rede", topNetwork.name)}
          ${microStat("Eficiência média", `${summary.avgEfficiency}%`)}
        </div>
        <canvas id="dashboard-profit-chart" width="860" height="260"></canvas>
      </article>

      <article class="chart-card chart-card--small">
        <div class="section-header">
          <div>
            <p class="card-eyebrow">Fluxo consolidado</p>
            <h2 class="section-title">Funil da operação</h2>
          </div>
        </div>
        <div class="funnel-list">
          ${funnelStep("Contas monitoradas", String(summary.totalAccounts))}
          ${funnelStep("Operadores ativos", String(summary.activeOperators))}
          ${funnelStep("Metas fechadas", String(summary.closedGoals))}
          ${funnelStep("Remessas no período", String(summary.filteredRemessas.length))}
          ${funnelStep("Lucro médio por conta", formatBRL(summary.avgPerAccount))}
        </div>
      </article>
    </section>

    <section class="banner-note">
      Ritmo atual: ${formatBRL(summary.avgTicket)} por operação concluída e projeção mensal de ${formatBRL(summary.projectedMonth)}.
    </section>

    <section class="dual-grid">
      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Leitura executiva</h2>
            <p class="section-copy">Síntese do que merece atenção imediata.</p>
          </div>
          ${statusPill("Painel saudável", "good")}
        </div>
        <div class="bullet-list">
          ${summary.insights.map((item) => `<div class="bullet-item">${escapeHtml(item)}</div>`).join("")}
        </div>
      </article>

      <article class="info-card info-card--mint">
        <div class="section-header">
          <div>
            <h2 class="section-title">Spotlight do ciclo</h2>
            <p class="section-copy">Onde está seu melhor resultado agora.</p>
          </div>
        </div>
        <div class="record-list">
          <div class="record-item">
            <strong>${escapeHtml(topOperator.name)}</strong>
            <span class="muted">${formatBRL(topOperator.profit)} • score ${topOperator.score} • ${topOperator.closedGoals} metas fechadas.</span>
          </div>
          <div class="record-item">
            <strong>${escapeHtml(topNetwork.name)}</strong>
            <span class="muted">${formatBRL(topNetwork.profit)} • risco ${escapeHtml(topNetwork.risk)} • ${topNetwork.approvalRate}% de aprovação.</span>
          </div>
        </div>
      </article>
    </section>

    <section class="dual-grid">
      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Atividade recente</h2>
            <p class="section-copy">Últimos movimentos relevantes registrados localmente.</p>
          </div>
        </div>
        <div class="timeline-list">
          ${data.activity
            .slice(0, 5)
            .map(
              (item) => `
                <div class="timeline-item">
                  <strong>${escapeHtml(item.title)}</strong>
                  <span class="muted">${escapeHtml(item.time)} • ${escapeHtml(item.description)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Alertas estratégicos</h2>
            <p class="section-copy">Leituras automáticas para priorização operacional.</p>
          </div>
        </div>
        <div class="record-list">
          ${data.alerts
            .map(
              (item) => `
                <div class="record-item">
                  <div class="list-row">
                    <strong>${escapeHtml(item.title)}</strong>
                    ${statusPill(item.level, item.tone)}
                  </div>
                  <span class="muted">${escapeHtml(item.body)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function renderOperators() {
  return `
    <section class="tab-strip">
      ${tabButton("operators:ranking", "Ranking", ui.operatorsTab)}
      ${tabButton("operators:equipe", "Equipe", ui.operatorsTab)}
      ${tabButton("operators:folha", "Folha", ui.operatorsTab)}
      ${tabButton("operators:config", "Políticas", ui.operatorsTab)}
    </section>
    ${
      ui.operatorsTab === "ranking"
        ? renderOperatorsRanking()
        : ui.operatorsTab === "equipe"
          ? renderOperatorsTeam()
          : ui.operatorsTab === "folha"
            ? renderOperatorsPayroll()
            : renderOperatorsConfig()
    }
  `;
}

function renderOperatorsRanking() {
  const summary = getOperatorSummary();
  const ordered = data.operators.slice().sort((a, b) => b.profit - a.profit);

  return `
    <section class="operator-grid">
      ${statCard("Operadores cadastrados", String(summary.total), "metric-value")}
      ${statCard("Ativos hoje", String(summary.active), "metric-value")}
      ${statCard("Depositantes totais", String(summary.depositors), "metric-value")}
      ${statCard("Score médio", `${summary.accuracy}%`, "metric-value")}
      ${statCard("Lucro da equipe", formatBRL(summary.profit), "money-value money-value--mint")}
    </section>

    <section class="dual-grid">
      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Ranking semanal</h2>
            <p class="section-copy">Performance ordenada por lucro, consistência e disciplina operacional.</p>
          </div>
          ${statusPill(`${summary.active} ativos`, "good")}
        </div>
        <div class="operator-list">
          ${ordered
            .map(
              (item, index) => `
                <div class="operator-item">
                  <div class="list-row">
                    <strong>#${index + 1} ${escapeHtml(item.name)}</strong>
                    <span class="badge badge--good">${formatBRL(item.profit)}</span>
                  </div>
                  <span class="muted">${item.deposits} depositantes • ${item.closedGoals} metas • velocidade ${item.speed}</span>
                  <div class="progress"><span style="width:${item.score}%"></span></div>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Radar da equipe</h2>
            <p class="section-copy">Leituras resumidas para gestão rápida.</p>
          </div>
        </div>
        <div class="bullet-list">
          <div class="bullet-item">Melhor operador atual: ${escapeHtml(summary.topOperator)}</div>
          <div class="bullet-item">Maior score de consistência: ${summary.topScore}/100</div>
          <div class="bullet-item">Lucro médio por operador: ${formatBRL(summary.avgProfit)}</div>
          <div class="bullet-item">Folha projetada da equipe: ${formatBRL(getPayrollTotal())}</div>
        </div>
      </article>
    </section>
  `;
}

function renderOperatorsTeam() {
  return `
    <section class="invite-card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Convites ativos</h2>
          <p class="section-copy">Links únicos para onboarding de novos operadores.</p>
        </div>
        <button class="primary-button" data-action="generate-invite">Gerar convite</button>
      </div>
      <div class="invite-list" style="margin-top:18px;">
        ${data.invites
          .map(
            (invite) => `
              <div class="invite-item">
                <div class="list-row">
                  <strong>${escapeHtml(invite.code)}</strong>
                  <div class="table-actions">
                    ${statusPill(invite.status, invite.status === "Pendente" ? "alert" : "good")}
                    <button class="mini-button" data-copy="${escapeHtml(invite.code)}">Copiar</button>
                  </div>
                </div>
                <span class="muted">Criado em ${formatDate(invite.date)} • expira em ${formatDate(invite.expiresAt)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="module-card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Mapa da equipe</h2>
          <p class="section-copy">Visão operacional com rede, score, ritmo e especialidade.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Operador</th>
              <th>Status</th>
              <th>Rede</th>
              <th>Especialidade</th>
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
                    <td>${escapeHtml(item.specialty)}</td>
                    <td>${item.score}</td>
                    <td class="money-value--mint">${formatBRL(item.profit)}</td>
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
  const rows = data.operators.map((item) => {
    const fixed = item.deposits * data.settings.perDepositor;
    const variable = item.profit * (data.settings.profitShare / 100);
    return {
      ...item,
      fixed,
      variable,
      total: fixed + variable,
    };
  });

  return `
    <section class="cost-grid">
      ${statCard("Modelo fixo por depositante", formatBRL(data.settings.perDepositor), "money-value")}
      ${statCard("Participação variável", `${data.settings.profitShare}%`, "metric-value")}
      ${statCard("Folha prevista", formatBRL(rows.reduce((sum, item) => sum + item.total, 0)), "money-value money-value--mint")}
    </section>

    <section class="module-card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Simulação de pagamento</h2>
          <p class="section-copy">Combinação entre valor por depositante e participação de resultado.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Operador</th>
              <th>Depositantes</th>
              <th>Fixo</th>
              <th>Variável</th>
              <th>Total projetado</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${item.deposits}</td>
                    <td>${formatBRL(item.fixed)}</td>
                    <td>${formatBRL(item.variable)}</td>
                    <td class="money-value--mint">${formatBRL(item.total)}</td>
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
    <section class="dual-grid">
      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Modelo operacional</h2>
            <p class="section-copy">Regras definidas hoje para condução da equipe.</p>
          </div>
        </div>
        <div class="bullet-list">
          <div class="bullet-item">Estrutura principal: ${escapeHtml(data.settings.operationModel)}</div>
          <div class="bullet-item">Pagamento fixo: ${formatBRL(data.settings.perDepositor)} por depositante</div>
          <div class="bullet-item">Participação no lucro: ${data.settings.profitShare}%</div>
          <div class="bullet-item">Slots preferidos: ${data.settings.favoriteSlots.join(", ")}</div>
        </div>
      </article>

      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Regras de disciplina</h2>
            <p class="section-copy">Pontos observados pelo gestor no dia a dia.</p>
          </div>
        </div>
        <div class="record-list">
          ${data.operatorPolicies
            .map(
              (item) => `
                <div class="record-item">
                  <strong>${escapeHtml(item.title)}</strong>
                  <span class="muted">${escapeHtml(item.description)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function renderNetworks() {
  const totalProfit = data.networks.reduce((sum, item) => sum + item.profit, 0);
  const avgScore = Math.round(data.networks.reduce((sum, item) => sum + item.score, 0) / data.networks.length);

  return `
    <section class="network-grid">
      ${statCard("Redes monitoradas", String(data.networks.length), "metric-value")}
      ${statCard("Score médio", `${avgScore}/100`, "metric-value")}
      ${statCard("Lucro consolidado", formatBRL(totalProfit), "money-value money-value--mint")}
    </section>

    <section class="dual-grid">
      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Ranking de redes</h2>
            <p class="section-copy">Comparativo por score, aprovação e resultado líquido.</p>
          </div>
        </div>
        <div class="record-list">
          ${data.networks
            .slice()
            .sort((a, b) => b.score - a.score)
            .map(
              (item, index) => `
                <div class="score-card">
                  <div class="list-row">
                    <strong>#${index + 1} ${escapeHtml(item.name)}</strong>
                    <span class="badge badge--good">${formatBRL(item.profit)}</span>
                  </div>
                  <span class="muted">${item.approvalRate}% de aprovação • risco ${escapeHtml(item.risk)} • ${item.closedGoals} metas</span>
                  <div class="progress"><span style="width:${item.score}%"></span></div>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Recomendações</h2>
            <p class="section-copy">Leituras práticas para a próxima decisão operacional.</p>
          </div>
        </div>
        <div class="bullet-list">
          ${data.networks
            .map(
              (item) => `
                <div class="bullet-item">
                  <strong>${escapeHtml(item.name)}:</strong> ${escapeHtml(item.recommendation)}
                </div>
              `
            )
            .join("")}
        </div>
      </article>
    </section>

    <section class="network-grid">
      ${data.networks
        .map(
          (item) => `
            <article class="network-card">
              <p class="card-eyebrow">${escapeHtml(item.name)}</p>
              <strong class="money-value">${formatBRL(item.profit)}</strong>
              <span class="muted">${item.accounts} contas • ${item.deposits} depósitos • ${item.remessas} remessas</span>
              ${statusPill(`${item.approvalRate}% aprovação`, item.approvalRate >= 82 ? "good" : item.approvalRate >= 74 ? "alert" : "danger")}
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderBilling() {
  return `
    <section class="tab-strip">
      ${tabButton("billing:overview", "Visão geral", ui.billingTab)}
      ${tabButton("billing:evolution", "Evolução", ui.billingTab)}
      ${tabButton("billing:history", "Histórico", ui.billingTab)}
    </section>

    <section class="filters-row">
      ${rangeButton("hoje")}
      ${rangeButton("7d")}
      ${rangeButton("30d")}
      ${rangeButton("all")}
    </section>

    ${
      ui.billingTab === "overview"
        ? renderBillingOverview()
        : ui.billingTab === "evolution"
          ? renderBillingEvolution()
          : renderBillingHistory()
    }
  `;
}

function renderBillingOverview() {
  const summary = getSummary();

  return `
    <section class="metrics-grid">
      <article class="chart-card">
        <div class="section-header">
          <div>
            <p class="card-eyebrow">Receita consolidada</p>
            <h2 class="section-title">Resultado financeiro da janela ativa</h2>
          </div>
          ${statusPill(`${summary.margin}% margem`, summary.margin >= 46 ? "good" : "alert")}
        </div>
        <strong class="money-value money-value--mint">${formatBRL(summary.netProfit)}</strong>
        <p class="section-copy">Receita líquida após dedução dos custos contabilizados no período.</p>
        <div class="small-grid" style="margin-top:18px;">
          ${microStat("Receita bruta", formatBRL(summary.revenueTotal))}
          ${microStat("Custos", formatBRL(summary.costTotal))}
          ${microStat("Ticket médio", formatBRL(summary.avgTicket))}
        </div>
        <canvas id="billing-overview-chart" width="860" height="240"></canvas>
      </article>

      <div class="list-grid">
        ${infoMetric("Lucro bruto", formatBRL(summary.profitTotal))}
        ${infoMetric("Total depositado", formatBRL(summary.totalDeposited))}
        ${infoMetric("Total sacado", formatBRL(summary.totalWithdrawn))}
        ${infoMetric("Taxa de aprovação", `${summary.approvalRate}%`)}
      </div>
    </section>

    <section class="dual-grid">
      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Inteligência financeira</h2>
            <p class="section-copy">Leitura de tendência com base no comportamento do período.</p>
          </div>
        </div>
        <div class="bullet-list">
          <div class="bullet-item">Tendência atual: ${escapeHtml(summary.trend)}</div>
          <div class="bullet-item">Lucro médio por meta: ${formatBRL(summary.avgGoalProfit)}</div>
          <div class="bullet-item">Previsão para atingir a meta global: ~${summary.forecastDays} dias</div>
        </div>
      </article>

      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Meta mensal</h2>
            <p class="section-copy">Objetivo atual configurado localmente.</p>
          </div>
          <button class="mini-button" data-action="raise-goal">+ R$ 5 mil</button>
        </div>
        <strong class="money-value">${Math.round((summary.netProfit / data.goals.monthly) * 100)}%</strong>
        <div class="progress" style="margin:18px 0 18px;">
          <span style="width:${Math.min(100, Math.round((summary.netProfit / data.goals.monthly) * 100))}%"></span>
        </div>
        <div class="triple-grid">
          ${statCard("Atingido", formatBRL(summary.netProfit), "money-value money-value--mint")}
          ${statCard("Falta", formatBRL(Math.max(0, data.goals.monthly - summary.netProfit)), "money-value")}
          ${statCard("Objetivo", formatBRL(data.goals.monthly), "money-value")}
        </div>
      </article>
    </section>
  `;
}

function renderBillingEvolution() {
  return `
    <section class="chart-card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Evolução do faturamento</h2>
          <p class="section-copy">Linha temporal de receita, lucro e custo no intervalo selecionado.</p>
        </div>
      </div>
      <canvas id="billing-evolution-chart" width="1200" height="280"></canvas>
    </section>

    <section class="chart-card chart-card--small">
      <div class="section-header">
        <div>
          <h2 class="section-title">Comparativo lucro x custo</h2>
          <p class="section-copy">Distribuição visual da intensidade financeira por dia.</p>
        </div>
      </div>
      <canvas id="billing-compare-chart" width="1200" height="220"></canvas>
    </section>
  `;
}

function renderBillingHistory() {
  const remessas = getFilteredRemessas(ui.billingRange);

  return `
    <section class="module-card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Histórico de operações</h2>
          <p class="section-copy">Tabela filtrada pelo intervalo ativo.</p>
        </div>
      </div>
      <div class="table-wrap">
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
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${remessas
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.id)}</td>
                    <td>${escapeHtml(item.operator)}</td>
                    <td>${formatBRL(item.value)}</td>
                    <td>${escapeHtml(item.source)}</td>
                    <td>${escapeHtml(item.target)}</td>
                    <td>${formatDate(item.date)}</td>
                    <td>${statusBadge(item.status)}</td>
                    <td><button class="mini-button" data-remove-remessa="${item.id}">Excluir</button></td>
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

function renderCosts() {
  const summary = getCostSummary();

  return `
    <section class="cost-grid">
      ${statCard("Custo do período", formatBRL(summary.periodCost), "money-value money-value--rose")}
      ${statCard("Lucro após custos", formatBRL(summary.netAfterCosts), summary.netAfterCosts >= 0 ? "money-value money-value--mint" : "money-value money-value--rose")}
      ${statCard("Média por lançamento", formatBRL(summary.avgCost), "money-value")}
    </section>

    <section class="dual-grid">
      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Distribuição por categoria</h2>
            <p class="section-copy">Entenda rapidamente onde o caixa está sendo consumido.</p>
          </div>
          <button class="ghost-button" data-action="open-cost">Adicionar custo</button>
        </div>
        <div class="bar-stack">
          ${summary.categories
            .map(
              (item) => `
                <div class="bar-line">
                  <div class="bar-line__head">
                    <span>${escapeHtml(item.label)}</span>
                    <strong>${formatBRL(item.value)}</strong>
                  </div>
                  <div class="bar-line__track">
                    <div class="bar-line__fill" style="width:${item.percent}%"></div>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Leitura de caixa</h2>
            <p class="section-copy">Interpretação rápida do impacto financeiro do custo atual.</p>
          </div>
        </div>
        <div class="bullet-list">
          <div class="bullet-item">Maior categoria: ${escapeHtml(summary.topCategory.label)} com ${formatBRL(summary.topCategory.value)}</div>
          <div class="bullet-item">Custo de hoje: ${formatBRL(summary.today)}</div>
          <div class="bullet-item">Peso dos custos sobre a receita: ${summary.weight}%</div>
        </div>
      </article>
    </section>

    <section class="module-card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Histórico de custos</h2>
          <p class="section-copy">Lançamentos locais com remoção individual e observações salvas.</p>
        </div>
      </div>
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
                <span class="muted">${formatDate(item.date)} • ${escapeHtml(item.owner)} • ${escapeHtml(item.note)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderPix() {
  return `
    <section class="dual-grid">
      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Cofre de chaves</h2>
            <p class="section-copy">Gestão local das chaves PIX vinculadas à operação.</p>
          </div>
        </div>
        <div class="pix-list">
          ${data.pixKeys
            .map(
              (item) => `
                <div class="pix-item">
                  <div class="list-row">
                    <strong>${escapeHtml(item.alias)}</strong>
                    <div class="table-actions">
                      ${statusPill(item.status, item.status === "Ativa" ? "good" : "alert")}
                      <button class="mini-button" data-copy="${escapeHtml(item.key)}">Copiar</button>
                      <button class="mini-button" data-toggle-pix="${item.id}">Alternar</button>
                    </div>
                  </div>
                  <span class="muted">${escapeHtml(item.bank)} • uso ${item.usage} • ${escapeHtml(item.owner)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Boas práticas</h2>
            <p class="section-copy">Checklist interno de segurança financeira.</p>
          </div>
        </div>
        <div class="bullet-list">
          ${data.pixPolicies.map((item) => `<div class="bullet-item">${escapeHtml(item)}</div>`).join("")}
        </div>
      </article>
    </section>
  `;
}

function renderAffiliates() {
  return `
    <section class="network-grid">
      ${data.affiliates
        .map(
          (item) => `
            <article class="partner-item">
              <p class="card-eyebrow">${escapeHtml(item.channel)}</p>
              <strong class="section-title">${escapeHtml(item.name)}</strong>
              <span class="muted">${escapeHtml(item.focus)}</span>
              <span class="badge badge--good">${item.share}% de participação</span>
            </article>
          `
        )
        .join("")}
    </section>

    <section class="module-card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Relacionamento e repasse</h2>
          <p class="section-copy">Base resumida dos parceiros estratégicos da operação.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Afiliado</th>
              <th>Canal</th>
              <th>Participação</th>
              <th>Origem estimada</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.affiliates
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${escapeHtml(item.channel)}</td>
                    <td>${item.share}%</td>
                    <td>${escapeHtml(item.focus)}</td>
                    <td>${statusPill(item.status, item.status === "Ativo" ? "good" : "alert")}</td>
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

function renderGovernance() {
  return `
    <section class="dual-grid">
      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Governança local</h2>
            <p class="section-copy">Camada de segurança e manutenção do painel.</p>
          </div>
          <button class="mini-button" data-action="toggle-maintenance">
            ${data.governance.maintenance ? "Desativar manutenção" : "Ativar manutenção"}
          </button>
        </div>
        <div class="bullet-list">
          <div class="bullet-item">Modo manutenção: ${data.governance.maintenance ? "Ativo" : "Desativado"}</div>
          <div class="bullet-item">Último backup marcado: ${escapeHtml(data.governance.lastBackup)}</div>
          <div class="bullet-item">Versão da base: ${escapeHtml(data.version)}</div>
          <div class="bullet-item">Destino de hospedagem: GitHub Pages</div>
        </div>
      </article>

      <article class="module-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Integridade da base</h2>
            <p class="section-copy">Ações locais para proteção do projeto.</p>
          </div>
          <button class="primary-button" data-action="run-backup">Marcar backup</button>
        </div>
        <div class="record-list">
          ${data.governance.checks
            .map(
              (item) => `
                <div class="record-item">
                  <div class="list-row">
                    <strong>${escapeHtml(item.title)}</strong>
                    ${statusPill(item.status, item.tone)}
                  </div>
                  <span class="muted">${escapeHtml(item.body)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function statCard(label, value, className) {
  return `
    <article class="glass-card stat-card">
      <p class="card-eyebrow">${label}</p>
      <strong class="${className}">${value}</strong>
    </article>
  `;
}

function microStat(label, value) {
  return `
    <div>
      <span class="muted" style="display:block;margin-bottom:6px;">${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function infoMetric(label, value) {
  return `
    <article class="info-card">
      <span class="muted" style="display:block;margin-bottom:8px;">${label}</span>
      <strong class="money-value">${value}</strong>
    </article>
  `;
}

function funnelStep(label, value) {
  return `
    <div class="funnel-step">
      <span class="muted">${label}</span>
      <strong class="money-value">${value}</strong>
    </div>
  `;
}

function tabButton(key, label, active) {
  const value = key.split(":")[1];
  return `<button class="tab-button ${value === active ? "is-active" : ""}" data-tab="${key}">${label}</button>`;
}

function rangeButton(value) {
  return `<button class="filter-chip ${ui.billingRange === value ? "is-active" : ""}" data-range="${value}">${labelRange(value)}</button>`;
}

function statusPill(label, tone) {
  return `<span class="status-pill status-pill--${tone}">${label}</span>`;
}

function statusBadge(status) {
  if (status === "concluida") return `<span class="badge badge--good">Concluída</span>`;
  if (status === "processando") return `<span class="badge badge--alert">Processando</span>`;
  return `<span class="badge badge--danger">Pendente</span>`;
}

function renderEmptyState(message) {
  return `
    <section class="empty-box">
      <div>
        <strong>${message}</strong>
      </div>
    </section>
  `;
}

function getSummary() {
  const filteredHistory = getFilteredHistory(ui.billingRange);
  const filteredRemessas = getFilteredRemessas(ui.billingRange);
  const filteredCosts = getFilteredCosts(ui.billingRange);
  const profitTotal = filteredHistory.profit.reduce((sum, item) => sum + item, 0);
  const revenueTotal = filteredHistory.revenue.reduce((sum, item) => sum + item, 0);
  const costSeriesTotal = filteredHistory.costs.reduce((sum, item) => sum + item, 0);
  const costEntriesTotal = filteredCosts.reduce((sum, item) => sum + item.value, 0);
  const costTotal = Math.max(costSeriesTotal, costEntriesTotal);
  const todayProfit = filteredHistory.profit[filteredHistory.profit.length - 1] ?? 0;
  const netProfit = revenueTotal - costTotal;
  const activeOperators = data.operators.filter((item) => item.status === "ativo").length;
  const totalAccounts = data.networks.reduce((sum, item) => sum + item.accounts, 0);
  const totalDeposited = data.networks.reduce((sum, item) => sum + item.deposits * 170, 0);
  const totalWithdrawn = Math.max(0, totalDeposited - profitTotal);
  const completedRemessas = filteredRemessas.filter((item) => item.status === "concluida").length;
  const avgPerAccount = totalAccounts ? netProfit / totalAccounts : 0;
  const avgTicket = completedRemessas ? netProfit / completedRemessas : 0;
  const approvalRate = Math.round(
    data.networks.reduce((sum, item) => sum + item.approvalRate, 0) / data.networks.length
  );
  const avgEfficiency = Math.round(data.operators.reduce((sum, item) => sum + item.score, 0) / data.operators.length);
  const margin = revenueTotal ? Math.round((netProfit / revenueTotal) * 100) : 0;
  const avgGoalProfit = data.goals.closed ? netProfit / data.goals.closed : 0;
  const forecastDays = Math.max(1, Math.ceil(Math.max(0, data.goals.global - netProfit) / Math.max(todayProfit, 1)));
  const projectedMonth = todayProfit * 22;

  return {
    filteredHistory,
    filteredRemessas,
    netProfit,
    revenueTotal,
    profitTotal,
    costTotal,
    todayProfit,
    activeOperators,
    totalAccounts,
    totalDeposited,
    totalWithdrawn,
    completedRemessas,
    avgPerAccount,
    avgTicket,
    avgEfficiency,
    margin,
    approvalRate,
    avgGoalProfit,
    forecastDays,
    projectedMonth,
    closedGoals: data.goals.closed,
    trend: filteredHistory.profit.at(-1) >= filteredHistory.profit[0] ? "subida controlada" : "oscilação em revisão",
    riskTone: approvalRate >= 82 ? "good" : approvalRate >= 74 ? "alert" : "danger",
    riskLabel: approvalRate >= 82 ? "Risco baixo" : approvalRate >= 74 ? "Risco moderado" : "Risco alto",
    insights: [
      `A margem operacional atual está em ${margin}% com ${completedRemessas} remessas concluídas no recorte.`,
      `A melhor rede segue em ${escapeHtml(getTopNetwork().name)} e o melhor operador é ${escapeHtml(getTopOperator().name)}.`,
      `Com o ritmo atual, a meta global pode ser alcançada em aproximadamente ${forecastDays} dias.`,
    ],
  };
}

function getOperatorSummary() {
  const total = data.operators.length;
  const active = data.operators.filter((item) => item.status === "ativo").length;
  const depositors = data.operators.reduce((sum, item) => sum + item.deposits, 0);
  const profit = data.operators.reduce((sum, item) => sum + item.profit, 0);
  const accuracy = Math.round(data.operators.reduce((sum, item) => sum + item.score, 0) / total);
  const top = getTopOperator();

  return {
    total,
    active,
    depositors,
    profit,
    accuracy,
    topOperator: top.name,
    topScore: top.score,
    avgProfit: profit / total,
  };
}

function getCostSummary() {
  const periodCosts = getFilteredCosts(ui.billingRange);
  const periodCost = periodCosts.reduce((sum, item) => sum + item.value, 0);
  const todayValue = today();
  const today = data.costs.filter((item) => item.date === todayValue).reduce((sum, item) => sum + item.value, 0);
  const netAfterCosts = getSummary().profitTotal - periodCost;
  const avgCost = periodCosts.length ? periodCost / periodCosts.length : 0;
  const grouped = groupBy(periodCosts, "type");
  const categories = Object.entries(grouped)
    .map(([label, items]) => ({
      label,
      value: items.reduce((sum, item) => sum + item.value, 0),
    }))
    .sort((a, b) => b.value - a.value);
  const total = categories.reduce((sum, item) => sum + item.value, 0) || 1;

  return {
    today,
    periodCost,
    netAfterCosts,
    avgCost,
    weight: Math.round((periodCost / Math.max(getSummary().revenueTotal, 1)) * 100),
    topCategory: categories[0] ?? { label: "Sem categoria", value: 0 },
    categories: categories.map((item) => ({
      ...item,
      percent: Math.round((item.value / total) * 100),
    })),
  };
}

function getTopOperator() {
  return data.operators.slice().sort((a, b) => b.profit - a.profit)[0];
}

function getTopNetwork() {
  return data.networks.slice().sort((a, b) => b.profit - a.profit)[0];
}

function getPayrollTotal() {
  return data.operators.reduce((sum, item) => {
    const fixed = item.deposits * data.settings.perDepositor;
    const variable = item.profit * (data.settings.profitShare / 100);
    return sum + fixed + variable;
  }, 0);
}

function getFilteredHistory(range) {
  const labels = data.history.labels;
  const profit = data.history.profit;
  const revenue = data.history.revenue;
  const costs = data.history.costs;
  const amount = range === "hoje" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : labels.length;
  const start = Math.max(0, labels.length - amount);

  return {
    labels: labels.slice(start),
    profit: profit.slice(start),
    revenue: revenue.slice(start),
    costs: costs.slice(start),
  };
}

function getFilteredRemessas(range) {
  const days = range === "hoje" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 9999;
  return data.remessas.filter((item) => daysBetween(item.date, today()) < days);
}

function getFilteredCosts(range) {
  const days = range === "hoje" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 9999;
  return data.costs.filter((item) => daysBetween(item.date, today()) < days);
}

function submitCost(event) {
  event.preventDefault();
  const item = {
    id: `cost-${Date.now()}`,
    type: document.querySelector("#cost-type").value,
    value: Number(document.querySelector("#cost-value").value),
    date: document.querySelector("#cost-date").value,
    owner: document.querySelector("#cost-owner").value.trim(),
    note: document.querySelector("#cost-note").value.trim() || "Sem observação.",
  };

  data.costs.push(item);
  persist();
  closeDialog("cost-dialog");
  event.target.reset();
  showToast("Custo salvo com sucesso.", "good");
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
    note: document.querySelector("#remessa-note").value.trim() || "Sem observação.",
  };

  data.remessas.unshift(item);
  persist();
  closeDialog("remessa-dialog");
  event.target.reset();
  showToast("Nova operação registrada.", "good");
  render();
}

function fillRemessaDefaults() {
  document.querySelector("#remessa-id").value = nextRemessaId();
  document.querySelector("#remessa-date").value = today();
}

function generateInvite() {
  const code = cryptoRandomHex(40);
  data.invites.unshift({
    id: `invite-${Date.now()}`,
    code,
    status: "Pendente",
    date: today(),
    expiresAt: addDays(today(), 7),
  });
  persist();
  showToast("Novo convite gerado para operador.", "good");
  render();
}

function importJson(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed.version || !parsed.operators || !parsed.networks) {
        throw new Error("Formato inválido");
      }
      data = parsed;
      persist();
      showToast("Base importada com sucesso.", "good");
      render();
    } catch {
      showToast("Não foi possível importar este arquivo.", "danger");
    }
    event.target.value = "";
  };

  reader.readAsText(file);
}

async function resetData() {
  const response = await fetch("data/seed.json");
  data = await response.json();
  persist();
  showToast("Modelo restaurado com sucesso.", "alert");
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
    document.querySelector("#cost-owner").value = data.profile.owner;
  }
  document.getElementById(id).showModal();
}

function closeDialog(id) {
  document.getElementById(id).close();
}

function copyValue(value) {
  navigator.clipboard?.writeText(value);
  showToast("Conteúdo copiado para a área de transferência.", "good");
}

function showToast(message, tone = "good") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${tone}`;
  toast.textContent = message;
  toastRegion.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2600);
}

function drawDashboardCharts() {
  const history = getFilteredHistory(ui.billingRange);
  drawMultiLineChart("dashboard-profit-chart", history.labels, [
    { values: history.revenue, stroke: "#57d2ff", fill: "rgba(87,210,255,0.12)" },
    { values: history.profit, stroke: "#76ffbc", fill: "rgba(118,255,188,0.12)" },
    { values: history.costs, stroke: "#ffb05c", fill: "rgba(255,176,92,0.08)" },
  ]);
}

function drawBillingCharts() {
  const history = getFilteredHistory(ui.billingRange);
  drawMultiLineChart("billing-overview-chart", history.labels, [
    { values: history.profit, stroke: "#76ffbc", fill: "rgba(118,255,188,0.12)" },
    { values: history.revenue, stroke: "#57d2ff", fill: "rgba(87,210,255,0.08)" },
  ]);
  drawMultiLineChart("billing-evolution-chart", history.labels, [
    { values: history.revenue, stroke: "#57d2ff", fill: "rgba(87,210,255,0.08)" },
    { values: history.profit, stroke: "#76ffbc", fill: "rgba(118,255,188,0.08)" },
    { values: history.costs, stroke: "#ffb05c", fill: "rgba(255,176,92,0.06)" },
  ]);
  drawBarChart("billing-compare-chart", history.labels, history.profit, "#39c7ff");
}

function drawMultiLineChart(id, labels, series) {
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

  const allValues = series.flatMap((item) => item.values);
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const stepX = (width - 90) / Math.max(labels.length - 1, 1);

  series.forEach((line) => {
    const points = line.values.map((value, index) => {
      const x = 44 + index * stepX;
      const normalized = (value - min) / Math.max(max - min, 1);
      const y = height - 40 - normalized * (height - 90);
      return { x, y };
    });

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const controlX = (current.x + next.x) / 2;
      ctx.bezierCurveTo(controlX, current.y, controlX, next.y, next.x, next.y);
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = line.stroke;
    ctx.shadowColor = line.stroke;
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - 30);
    ctx.lineTo(points[0].x, points[0].y);
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const controlX = (current.x + next.x) / 2;
      ctx.bezierCurveTo(controlX, current.y, controlX, next.y, next.x, next.y);
    }
    ctx.lineTo(points.at(-1).x, height - 30);
    ctx.closePath();
    ctx.fillStyle = line.fill;
    ctx.fill();

    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = line.stroke;
      ctx.fill();
    });
  });

  labels.forEach((label, index) => {
    const x = 44 + index * stepX;
    ctx.fillStyle = "rgba(191,203,221,0.7)";
    ctx.font = "12px Inter";
    ctx.fillText(label, x - 14, height - 10);
  });
}

function drawBarChart(id, labels, values, color) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  const max = Math.max(...values, 1);
  const barWidth = (width - 120) / values.length;

  values.forEach((value, index) => {
    const barHeight = (value / max) * (height - 70);
    const x = 54 + index * barWidth;
    const y = height - 30 - barHeight;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, y, Math.max(18, barWidth - 18), barHeight);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(191,203,221,0.7)";
    ctx.font = "12px Inter";
    ctx.fillText(labels[index], x, height - 10);
  });
}

function nextRemessaId() {
  const max = data.remessas.reduce((acc, item) => {
    const value = Number(item.id.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(acc, value) : acc;
  }, 9800);
  return `REM-${max + 1}`;
}

function groupBy(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] ??= [];
    acc[item[key]].push(item);
    return acc;
  }, {});
}

function labelRange(value) {
  if (value === "hoje") return "Hoje";
  if (value === "7d") return "7 dias";
  if (value === "30d") return "30 dias";
  return "Tudo";
}

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${date}T00:00:00`));
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.abs(Math.floor((end - start) / 86400000));
}

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const current = new Date(`${date}T00:00:00`);
  current.setDate(current.getDate() + amount);
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const day = String(current.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cryptoRandomHex(length) {
  const chars = "abcdef0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
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
