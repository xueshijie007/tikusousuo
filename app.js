﻿const state = {
  allQuestions: [],
  filtered: [],
  page: 1,
  pageSize: 20
};

const refs = {
  queryInput: document.getElementById("queryInput"),
  pageSizeSelect: document.getElementById("pageSizeSelect"),
  searchBtn: document.getElementById("searchBtn"),
  resetBtn: document.getElementById("resetBtn"),
  summary: document.getElementById("summary"),
  resultList: document.getElementById("resultList"),
  pagination: document.getElementById("pagination"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  pageInfo: document.getElementById("pageInfo")
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function tokenize(query) {
  return [...new Set(normalize(query).split(/[\s,，;；、]+/).filter(Boolean))];
}

function buildCorpus(question) {
  const optionText = (question.options || []).map((opt) => `${opt.key} ${opt.text}`).join(" ");
  return normalize(`${question.id} ${question.stem} ${optionText} ${question.answer} ${question.subject} ${question.qtype}`);
}

function scoreQuestion(question, query, tokens) {
  if (!query) return 0;

  const stem = normalize(question.stem);
  const answer = normalize(question.answer);
  const optionText = normalize((question.options || []).map((opt) => `${opt.key} ${opt.text}`).join(" "));
  const corpus = buildCorpus(question);

  const idMatch = query.match(/\d+/);
  const idTarget = idMatch ? Number(idMatch[0]) : null;

  let score = 0;
  if (idTarget && Number(question.id) === idTarget) score += 30;
  if (stem.includes(query)) score += 12;
  if (answer.includes(query)) score += 8;
  if (optionText.includes(query)) score += 6;

  for (const token of tokens) {
    if (!corpus.includes(token)) {
      return -1;
    }
    score += 2;
    if (answer === token) score += 4;
  }

  return score;
}

function highlightText(text, tokens) {
  const cleaned = [...new Set(tokens.filter(Boolean))];
  if (!cleaned.length) return escapeHtml(text);

  const pattern = new RegExp(cleaned.map(escapeRegExp).sort((a, b) => b.length - a.length).join("|"), "gi");
  let result = "";
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const index = match.index;
    result += escapeHtml(text.slice(cursor, index));
    result += `<mark>${escapeHtml(match[0])}</mark>`;
    cursor = index + match[0].length;
  }

  result += escapeHtml(text.slice(cursor));
  return result;
}

function applyFilters(resetPage = true) {
  const query = normalize(refs.queryInput.value);
  state.pageSize = Number(refs.pageSizeSelect.value) || 20;

  const tokens = tokenize(query);

  const rows = [];
  for (const question of state.allQuestions) {
    const score = scoreQuestion(question, query, tokens);
    if (query && score < 0) continue;

    rows.push({ question, score });
  }

  rows.sort((a, b) => {
    if (query) {
      if (b.score !== a.score) return b.score - a.score;
    }
    return Number(a.question.id) - Number(b.question.id);
  });

  state.filtered = rows.map((item) => item.question);
  if (resetPage) state.page = 1;
}

function renderSummary() {
  if (!state.allQuestions.length) {
    refs.summary.textContent = "题库为空，请检查 data/questions.json。";
    return;
  }

  const total = state.allQuestions.length;
  const matched = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(matched / state.pageSize));
  state.page = Math.min(Math.max(1, state.page), totalPages);

  if (!matched) {
    refs.summary.textContent = `题库共 ${total} 题，当前筛选无结果。`;
    return;
  }

  const start = (state.page - 1) * state.pageSize + 1;
  const end = Math.min(start + state.pageSize - 1, matched);
  refs.summary.textContent = `题库共 ${total} 题，当前命中 ${matched} 题，显示第 ${start}-${end} 条。`;
}

function renderList() {
  refs.resultList.innerHTML = "";
  const tokens = tokenize(refs.queryInput.value);

  if (!state.filtered.length) {
    refs.resultList.innerHTML = '<article class="card">没有找到匹配题目，建议缩短关键词或切换筛选条件。</article>';
    refs.pagination.classList.add("hidden");
    return;
  }

  const start = (state.page - 1) * state.pageSize;
  const end = start + state.pageSize;
  const pageRows = state.filtered.slice(start, end);

  const html = pageRows
    .map((question) => {
      const optionsHtml = (question.options || []).length
        ? `<ol class="option-list">${question.options
            .map((opt) => `<li><strong>${escapeHtml(opt.key)}.</strong> ${highlightText(opt.text, tokens)}</li>`)
            .join("")}</ol>`
        : "";

      const source = question.source ? `<span>来源：${escapeHtml(question.source)}</span>` : "";

      return `
        <article class="result-card">
          <div class="result-meta">题号 ${escapeHtml(question.id)} | ${escapeHtml(question.subject)} | ${escapeHtml(
        question.qtype
      )} ${source ? `| ${source}` : ""}</div>
          <div class="result-stem">${highlightText(question.stem, tokens)}</div>
          ${optionsHtml}
          <div class="answer">答案：${highlightText(question.answer, tokens)}</div>
        </article>
      `;
    })
    .join("");

  refs.resultList.innerHTML = html;
  renderPagination();
}

function renderPagination() {
  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));

  if (totalPages <= 1) {
    refs.pagination.classList.add("hidden");
    return;
  }

  refs.pagination.classList.remove("hidden");
  refs.pageInfo.textContent = `第 ${state.page} / ${totalPages} 页`;
  refs.prevBtn.disabled = state.page <= 1;
  refs.nextBtn.disabled = state.page >= totalPages;
}

function refresh(resetPage = true) {
  applyFilters(resetPage);
  renderSummary();
  renderList();
}

function bindEvents() {
  refs.searchBtn.addEventListener("click", () => {
    refresh(true);
    refs.queryInput.value = "";
  });

  refs.resetBtn.addEventListener("click", () => {
    refs.queryInput.value = "";
    refs.pageSizeSelect.value = "20";
    refresh(true);
  });

  refs.queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      refresh(true);
    }
  });

  refs.pageSizeSelect.addEventListener("change", () => refresh(true));

  refs.prevBtn.addEventListener("click", () => {
    state.page -= 1;
    renderSummary();
    renderList();
  });

  refs.nextBtn.addEventListener("click", () => {
    state.page += 1;
    renderSummary();
    renderList();
  });
}

async function loadQuestions() {
  const response = await fetch("./data/questions.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("题库格式错误");
  }

  state.allQuestions = data;
}

async function init() {
  bindEvents();

  try {
    await loadQuestions();
    refresh(true);
  } catch (error) {
    refs.summary.textContent = `加载失败：${error.message}`;
    refs.resultList.innerHTML =
      '<article class="card">请确认以 HTTP 服务方式访问站点，例如运行 python -m http.server 8000。</article>';
    refs.pagination.classList.add("hidden");
  }
}

init();
