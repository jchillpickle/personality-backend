const state = {
  rows: [],
  selectedId: ""
};

const refs = {
  apiKey: document.querySelector("#apiKey"),
  limit: document.querySelector("#limit"),
  testVersion: document.querySelector("#testVersion"),
  loadBtn: document.querySelector("#loadBtn"),
  downloadBtn: document.querySelector("#downloadBtn"),
  status: document.querySelector("#status"),
  recordsList: document.querySelector("#recordsList"),
  recordDetail: document.querySelector("#recordDetail")
};

const STORAGE_KEY = "personality_admin_api_key";

init();

function init() {
  const saved = window.localStorage.getItem(STORAGE_KEY) || "";
  refs.apiKey.value = saved;

  refs.loadBtn.addEventListener("click", loadRecords);
  refs.downloadBtn.addEventListener("click", downloadCsv);

  if (saved) {
    loadRecords();
  }
}

async function loadRecords() {
  const apiKey = refs.apiKey.value.trim();
  const limit = normalizeLimit(refs.limit.value);
  const testVersion = refs.testVersion.value.trim();

  if (!apiKey) {
    setStatus("Enter API key first.", true);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, apiKey);
  setStatus("Loading records...", false);

  const query = new URLSearchParams({ limit: String(limit) });
  if (testVersion) query.set("testVersion", testVersion);

  try {
    const res = await fetch(`/api/submissions?${query.toString()}`, {
      headers: { "x-api-key": apiKey }
    });
    const data = await res.json();

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    state.rows = Array.isArray(data.rows) ? data.rows : [];
    state.selectedId = state.rows[0]?.submissionId || "";

    renderList();
    renderDetail();
    setStatus(`Loaded ${state.rows.length} record(s).`, false);
  } catch (error) {
    setStatus(`Load failed: ${error.message || "Unknown error"}`, true);
    state.rows = [];
    renderList();
    refs.recordDetail.innerHTML = `<div class="empty">Could not load records.</div>`;
  }
}

async function downloadCsv() {
  const apiKey = refs.apiKey.value.trim();
  const limit = normalizeLimit(refs.limit.value);
  const testVersion = refs.testVersion.value.trim();

  if (!apiKey) {
    setStatus("Enter API key first.", true);
    return;
  }

  const query = new URLSearchParams({ format: "csv", limit: String(limit) });
  if (testVersion) query.set("testVersion", testVersion);

  try {
    setStatus("Downloading CSV...", false);
    const res = await fetch(`/api/admin/submissions/download?${query.toString()}`, {
      headers: { "x-api-key": apiKey }
    });

    if (!res.ok) {
      const fail = await safeJson(res);
      throw new Error(fail?.error || `HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const file = `personality-submissions-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;

    const link = document.createElement("a");
    link.href = url;
    link.download = file;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    setStatus("CSV download ready.", false);
  } catch (error) {
    setStatus(`CSV download failed: ${error.message || "Unknown error"}`, true);
  }
}

function renderList() {
  if (!state.rows.length) {
    refs.recordsList.innerHTML = `<div class="empty">No records found.</div>`;
    return;
  }

  refs.recordsList.innerHTML = state.rows.map((row) => {
    const isActive = row.submissionId === state.selectedId;
    const completion = Number(row.profile?.completionPct || 0);
    const mbti = row.profile?.mbti?.typeDisplay || row.profile?.mbti?.type || "N/A";
    const when = row.receivedAt || row.submittedAt || "";

    return `
      <article class="record-item ${isActive ? "active" : ""}" data-id="${escapeHtml(row.submissionId || "")}">
        <h3>${escapeHtml(row.candidateName || "Unknown")}</h3>
        <p>${escapeHtml(row.candidateEmail || "")}</p>
        <p>${escapeHtml(formatDate(when))}</p>
        <p>MBTI ${escapeHtml(mbti)} | Completion ${completion}%</p>
      </article>
    `;
  }).join("");

  refs.recordsList.querySelectorAll(".record-item").forEach((node) => {
    node.addEventListener("click", () => {
      state.selectedId = node.getAttribute("data-id") || "";
      renderList();
      renderDetail();
    });
  });
}

function renderDetail() {
  const row = state.rows.find((x) => x.submissionId === state.selectedId) || state.rows[0];
  if (!row) {
    refs.recordDetail.innerHTML = `<div class="empty">Select a submission to view details.</div>`;
    return;
  }

  const profile = row.profile || {};
  const interpretation = profile.interpretation || {};
  const calibration = profile.calibration || {};
  const wg = normalizeWorkingGenius(profile.workingGenius || {});

  const kpis = `
    <div class="kpi-grid">
      <div class="kpi"><strong>Name</strong><br>${escapeHtml(row.candidateName || "N/A")}</div>
      <div class="kpi"><strong>Email</strong><br>${escapeHtml(row.candidateEmail || "N/A")}</div>
      <div class="kpi"><strong>Version</strong><br>${escapeHtml(row.testVersion || "N/A")}</div>
      <div class="kpi"><strong>MBTI</strong><br>${escapeHtml(profile.mbti?.typeDisplay || profile.mbti?.type || "N/A")}</div>
      <div class="kpi"><strong>Completion</strong><br>${Number(profile.completionPct || 0)}%</div>
      <div class="kpi"><strong>WG Weighted</strong><br>${Number(wg.weightedScore || 0)}%</div>
      <div class="kpi"><strong>WG Genius</strong><br>${escapeHtml(joinLabels(wg.genius))}</div>
      <div class="kpi"><strong>WG Competency</strong><br>${escapeHtml(joinLabels(wg.competency))}</div>
      <div class="kpi"><strong>WG Frustration</strong><br>${escapeHtml(joinLabels(wg.frustration))}</div>
      <div class="kpi"><strong>Profile Type</strong><br>${escapeHtml(interpretation.profileType || "N/A")}</div>
      <div class="kpi"><strong>Fit Tags</strong><br>${escapeHtml((interpretation.fitTags || []).join(", ") || "None")}</div>
      <div class="kpi"><strong>Risk Flags</strong><br>${escapeHtml((interpretation.riskFlags || []).join(", ") || "None")}</div>
    </div>
  `;

  const calibrationBox = calibration?.hasKnown
    ? `
      <div class="calibration section">
        <h3>Calibration Against Known Assessments</h3>
        <p><strong>Overall:</strong> ${escapeHtml(formatOverallCalibration(calibration))}</p>
        <p><strong>MBTI Match:</strong> ${escapeHtml(formatMeasure(calibration.mbtiMatch))}</p>
        <p><strong>DISC Match:</strong> ${escapeHtml(formatMeasure(calibration.discMatch))}</p>
        <p><strong>Strengths Match:</strong> ${escapeHtml(formatMeasure(calibration.strengthsMatch))}</p>
        <p><strong>Working Genius Match:</strong> ${escapeHtml(formatMeasure(calibration.geniusMatch))}</p>
      </div>
    `
    : `
      <div class="calibration section">
        <h3>Calibration</h3>
        <p>No known baseline assessments were provided for this submission.</p>
      </div>
    `;

  refs.recordDetail.innerHTML = `
    ${kpis}

    <div class="section report-grid">
      <div class="report-card">
        <h3>MBTI Pair Graph</h3>
        <div class="bar-list">${buildMbtiRows(profile.mbti?.pairs || [])}</div>
      </div>
      <div class="report-card">
        <h3>DISC Graph</h3>
        <div class="bar-list">${buildBarRows(profile.disc?.ranking || [])}</div>
      </div>
      <div class="report-card">
        <h3>Strengths Domains Graph</h3>
        <div class="bar-list">${buildBarRows(profile.strengths?.ranking || [])}</div>
      </div>
      <div class="report-card">
        <h3>Working Genius Graph</h3>
        <div class="bar-list">${buildBarRows(wg.ranking)}</div>
      </div>
      <div class="report-card">
        <h3>Archetype Fit Graph</h3>
        <div class="bar-list">${buildArchetypeRows(profile.archetypes || [])}</div>
      </div>
    </div>

    ${calibrationBox}
  `;
}

function normalizeWorkingGenius(raw) {
  const ranking = Array.isArray(raw.ranking) ? raw.ranking : [];
  const genius = Array.isArray(raw.genius) ? raw.genius : ranking.slice(0, 2);
  const competency = Array.isArray(raw.competency) ? raw.competency : ranking.slice(2, 4);
  const frustration = Array.isArray(raw.frustration) ? raw.frustration : ranking.slice(4, 6);

  const weightedScore = Number.isFinite(Number(raw.weightedScore))
    ? Number(raw.weightedScore)
    : Math.round((avg(genius) * 0.55) + (avg(competency) * 0.3) + ((100 - avg(frustration)) * 0.15));

  return {
    ranking,
    genius,
    competency,
    frustration,
    weightedScore: clampPct(weightedScore)
  };
}

function avg(items) {
  if (!items.length) return 0;
  return items.reduce((sum, x) => sum + Number(x.pct || x.score || 0), 0) / items.length;
}

function joinLabels(items) {
  return (items || []).map((x) => x.label).join(", ") || "None";
}

function buildBarRows(items) {
  return (items || []).map((item) => `
    <div class="bar-row">
      <div class="bar-row-head"><span>${escapeHtml(item.label || "N/A")}</span><span>${Math.round(Number(item.pct || 0))}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${clampPct(item.pct)}%"></div></div>
    </div>
  `).join("");
}

function buildArchetypeRows(items) {
  return (items || []).map((item) => `
    <div class="bar-row">
      <div class="bar-row-head"><span>${escapeHtml(item.label || "N/A")}</span><span>${Math.round(Number(item.score || 0))}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${clampPct(item.score)}%"></div></div>
    </div>
  `).join("");
}

function buildMbtiRows(pairs) {
  return (pairs || []).map((pair) => {
    const left = Math.round(Number(pair.leftPct || 0));
    const right = Math.round(Number(pair.rightPct || 0));
    const winner = pair.balanced ? "Balanced" : pair.winner;

    return `
      <div class="bar-row">
        <div class="bar-row-head"><span>${escapeHtml(pair.left || "?")}/${escapeHtml(pair.right || "?")}</span><span>${escapeHtml(winner)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${clampPct(Math.max(left, right))}%"></div></div>
      </div>
    `;
  }).join("");
}

function normalizeLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 100;
  return Math.min(Math.floor(parsed), 500);
}

function formatDate(input) {
  if (!input) return "N/A";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleString();
}

function formatMeasure(measure) {
  if (!measure) return "N/A";
  return `${measure.score}% - ${measure.detail}`;
}

function formatOverallCalibration(cal) {
  if (!cal?.overall) return "N/A";
  return `${cal.overall.score}% (${cal.overall.band})`;
}

function setStatus(text, isError) {
  refs.status.textContent = text;
  refs.status.classList.toggle("muted", !isError);
  refs.status.style.color = isError ? "#b02a37" : "";
}

function clampPct(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
