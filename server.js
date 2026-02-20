import "dotenv/config";
import express from "express";
import cors from "cors";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { google } from "googleapis";

const app = express();
const port = Number(process.env.PORT || 8788);
const minDurationMinutes = Number(process.env.MIN_DURATION_MINUTES || 8);
const maxDurationMinutes = Number(process.env.MAX_DURATION_MINUTES || 180);

const PROFILE_LABEL = "Leadership Personality Profile";
const DEFAULT_TEST_VERSION = "personality-v1-52q";

const QUESTION_KEY = [
  { id: 1, model: "mbti", trait: "E" },
  { id: 2, model: "mbti", trait: "I" },
  { id: 3, model: "mbti", trait: "S" },
  { id: 4, model: "mbti", trait: "N" },
  { id: 5, model: "mbti", trait: "T" },
  { id: 6, model: "mbti", trait: "F" },
  { id: 7, model: "mbti", trait: "J" },
  { id: 8, model: "mbti", trait: "P" },
  { id: 9, model: "mbti", trait: "E" },
  { id: 10, model: "mbti", trait: "I" },
  { id: 11, model: "mbti", trait: "S" },
  { id: 12, model: "mbti", trait: "N" },
  { id: 13, model: "mbti", trait: "T" },
  { id: 14, model: "mbti", trait: "F" },
  { id: 15, model: "mbti", trait: "J" },
  { id: 16, model: "mbti", trait: "P" },

  { id: 17, model: "disc", trait: "D" },
  { id: 18, model: "disc", trait: "I_DISC" },
  { id: 19, model: "disc", trait: "S_DISC" },
  { id: 20, model: "disc", trait: "C" },
  { id: 21, model: "disc", trait: "D" },
  { id: 22, model: "disc", trait: "I_DISC" },
  { id: 23, model: "disc", trait: "S_DISC" },
  { id: 24, model: "disc", trait: "C" },
  { id: 25, model: "disc", trait: "D" },
  { id: 26, model: "disc", trait: "I_DISC" },
  { id: 27, model: "disc", trait: "S_DISC" },
  { id: 28, model: "disc", trait: "C" },

  { id: 29, model: "strengths", trait: "EXEC" },
  { id: 30, model: "strengths", trait: "INFL" },
  { id: 31, model: "strengths", trait: "REL" },
  { id: 32, model: "strengths", trait: "STRAT" },
  { id: 33, model: "strengths", trait: "EXEC" },
  { id: 34, model: "strengths", trait: "INFL" },
  { id: 35, model: "strengths", trait: "REL" },
  { id: 36, model: "strengths", trait: "STRAT" },
  { id: 37, model: "strengths", trait: "EXEC" },
  { id: 38, model: "strengths", trait: "INFL" },
  { id: 39, model: "strengths", trait: "REL" },
  { id: 40, model: "strengths", trait: "STRAT" },

  { id: 41, model: "genius", trait: "WG_W" },
  { id: 42, model: "genius", trait: "WG_I" },
  { id: 43, model: "genius", trait: "WG_D" },
  { id: 44, model: "genius", trait: "WG_G" },
  { id: 45, model: "genius", trait: "WG_E" },
  { id: 46, model: "genius", trait: "WG_T" },
  { id: 47, model: "genius", trait: "WG_W" },
  { id: 48, model: "genius", trait: "WG_I" },
  { id: 49, model: "genius", trait: "WG_D" },
  { id: 50, model: "genius", trait: "WG_G" },
  { id: 51, model: "genius", trait: "WG_E" },
  { id: 52, model: "genius", trait: "WG_T" }
];

const TRAIT_META = {
  E: { label: "Extraversion" },
  I: { label: "Introversion" },
  S: { label: "Sensing" },
  N: { label: "Intuition" },
  T: { label: "Thinking" },
  F: { label: "Feeling" },
  J: { label: "Judging" },
  P: { label: "Perceiving" },
  D: { label: "Dominance" },
  I_DISC: { label: "Influence" },
  S_DISC: { label: "Steadiness" },
  C: { label: "Conscientiousness" },
  EXEC: { label: "Executing" },
  INFL: { label: "Influencing" },
  REL: { label: "Relationship Building" },
  STRAT: { label: "Strategic Thinking" },
  WG_W: { label: "Wonder" },
  WG_I: { label: "Invention" },
  WG_D: { label: "Discernment" },
  WG_G: { label: "Galvanizing" },
  WG_E: { label: "Enablement" },
  WG_T: { label: "Tenacity" }
};

const TOTAL_QUESTIONS = QUESTION_KEY.length;
const MAX_LIMIT = 5000;
const MAX_NAME_LEN = 120;
const MAX_TEST_VERSION_LEN = 60;
const REQUIRE_SUBMISSION_API_KEY = parseBoolEnv("REQUIRE_SUBMISSION_API_KEY", false);
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 10 * 60 * 1000);
const RATE_MAX_SUBMISSIONS = Number(process.env.RATE_MAX_SUBMISSIONS || 30);
const RATE_MAX_ADMIN = Number(process.env.RATE_MAX_ADMIN || 120);
const RATE_BUCKETS = new Map();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const EMAIL_TYPO_MAP = {
  "gmial.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gmail.co": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "hotnail.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.co": "icloud.com"
};
const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "live.com",
  "msn.com",
  "larkinsrestaurants.com"
];

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = allowedOrigins();
      if (!origin || allowed.length === 0 || allowed.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error("Origin not allowed"));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-api-key"]
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "personality-assessment-backend" });
});

app.post("/api/submissions", async (req, res) => {
  try {
    enforceJsonRequest(req);
    enforceRateLimit(req, "submit", RATE_MAX_SUBMISSIONS, RATE_WINDOW_MS);
    enforceSubmissionAccess(req);

    const submission = validateSubmission(req.body);
    const profile = scoreProfile(submission.answers, submission.durationMinutes);

    const record = {
      submissionId: createSubmissionId(),
      receivedAt: new Date().toISOString(),
      ...submission,
      profile
    };

    await appendSubmission(record);
    const emailed = await trySendSubmissionEmail(record);

    res.json({
      ok: true,
      submissionId: record.submissionId,
      emailed,
      profile
    });
  } catch (error) {
    const status = error?.statusCode || 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(status).json({ ok: false, error: message });
  }
});

app.get("/api/submissions", async (req, res) => {
  try {
    enforceRateLimit(req, "admin-list", RATE_MAX_ADMIN, RATE_WINDOW_MS);
    requireApiKey(req);

    const limit = parseLimit(req.query.limit, 50);
    const testVersion = String(req.query.testVersion || "").trim();

    const rows = await readSubmissions(limit);
    const filtered = filterByTestVersion(rows, testVersion);

    res.json({ ok: true, count: filtered.length, rows: filtered });
  } catch (error) {
    const status = error?.statusCode || 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(status).json({ ok: false, error: message });
  }
});

app.get("/api/admin/submissions/download", async (req, res) => {
  try {
    enforceRateLimit(req, "admin-download", RATE_MAX_ADMIN, RATE_WINDOW_MS);
    requireApiKey(req);

    const limit = parseLimit(req.query.limit, 500);
    const format = String(req.query.format || "csv").trim().toLowerCase();
    const testVersion = String(req.query.testVersion || "").trim();

    const rows = await readSubmissions(limit);
    const filtered = filterByTestVersion(rows, testVersion);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (format === "json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="personality-submissions-${stamp}.json"`);
      res.send(JSON.stringify(filtered, null, 2));
      return;
    }

    const csv = buildSubmissionCsv(filtered);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="personality-submissions-${stamp}.csv"`);
    res.send(csv);
  } catch (error) {
    const status = error?.statusCode || 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(status).json({ ok: false, error: message });
  }
});

function allowedOrigins() {
  return String(process.env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function enforceSubmissionAccess(req) {
  const expected = String(process.env.API_KEY || "").trim();
  const received = String(req.headers["x-api-key"] || "").trim();

  if (expected && timingSafeEqual(expected, received)) return;

  if (REQUIRE_SUBMISSION_API_KEY && expected) {
    fail(401, "Submission API key required.");
  }

  const origin = String(req.headers.origin || "").trim();
  const allowed = allowedOrigins();
  if (allowed.length && origin && allowed.includes(origin)) return;

  if (!expected && allowed.length === 0) return;

  fail(401, "Unauthorized submission origin or API key.");
}

function requireApiKey(req) {
  const expected = String(process.env.API_KEY || "").trim();
  if (!expected) {
    fail(401, "API_KEY is required for this endpoint.");
  }

  const received = String(req.headers["x-api-key"] || "").trim();
  if (!timingSafeEqual(expected, received)) {
    fail(401, "Unauthorized API key.");
  }
}

function validateSubmission(input) {
  const body = input || {};
  const candidateName = String(body.candidateName || "").trim();
  const candidateEmail = String(body.candidateEmail || "").trim().toLowerCase();
  const submittedAt = String(body.submittedAt || "").trim() || new Date().toISOString();
  const durationMinutes = Number(body.durationMinutes || 0);
  const autoSubmitted = Boolean(body.autoSubmitted);
  const testVersion = normalizeTestVersion(String(body.testVersion || DEFAULT_TEST_VERSION).trim());

  if (!candidateName) fail(400, "Missing candidateName");
  if (candidateName.length > MAX_NAME_LEN) fail(400, "candidateName is too long");
  if (!isValidEmailFormat(candidateEmail)) fail(400, "Missing or invalid candidateEmail");
  if (candidateEmail.length > 254) fail(400, "candidateEmail is too long");
  if (!isFinite(durationMinutes) || durationMinutes < 0 || durationMinutes > maxDurationMinutes) {
    fail(400, "Invalid durationMinutes");
  }
  if (!Number.isFinite(Date.parse(submittedAt))) fail(400, "Invalid submittedAt");

  const suggestion = suggestEmailCorrection(candidateEmail);
  if (suggestion) {
    fail(400, `Possible candidateEmail typo. Did you mean ${suggestion}?`);
  }

  const rawAnswers = body.answers || {};
  const answers = {};

  QUESTION_KEY.forEach((q) => {
    const rawValue = rawAnswers[q.id] ?? rawAnswers[String(q.id)] ?? 0;
    const value = Number(rawValue);
    answers[q.id] = Number.isInteger(value) && value >= 1 && value <= 5 ? value : 0;
  });

  return {
    candidateName,
    candidateEmail,
    submittedAt,
    durationMinutes,
    autoSubmitted,
    testVersion,
    answers,
    roleLabel: PROFILE_LABEL
  };
}

function scoreProfile(answers, durationMinutes) {
  const traitTotals = buildTraitTotals();
  let answeredCount = 0;

  QUESTION_KEY.forEach((q) => {
    const value = Number(answers[q.id] || 0);
    if (!Number.isInteger(value) || value < 1 || value > 5) return;
    answeredCount += 1;

    traitTotals[q.trait].score += value;
    traitTotals[q.trait].count += 1;
  });

  Object.keys(traitTotals).forEach((key) => {
    const row = traitTotals[key];
    row.avg = row.count > 0 ? row.score / row.count : 0;
    row.pct = row.count > 0 ? ((row.avg - 1) / 4) * 100 : 0;
  });

  const mbtiPairs = [
    { left: "E", right: "I", label: "Energy Focus" },
    { left: "S", right: "N", label: "Information Style" },
    { left: "T", right: "F", label: "Decision Lens" },
    { left: "J", right: "P", label: "Execution Preference" }
  ].map((pair) => {
    const leftPct = traitTotals[pair.left].pct;
    const rightPct = traitTotals[pair.right].pct;
    const winner = leftPct >= rightPct ? pair.left : pair.right;
    const margin = Math.round(Math.abs(leftPct - rightPct));
    const balanced = margin < 8;

    return {
      ...pair,
      leftPct,
      rightPct,
      winner,
      margin,
      balanced
    };
  });

  const mbtiType = mbtiPairs.map((pair) => pair.winner).join("");

  const discRanking = rankTraits(["D", "I_DISC", "S_DISC", "C"], traitTotals);
  const strengthsRanking = rankTraits(["EXEC", "INFL", "REL", "STRAT"], traitTotals);
  const geniusRanking = rankTraits(["WG_W", "WG_I", "WG_D", "WG_G", "WG_E", "WG_T"], traitTotals);

  const archetypes = [
    {
      label: "Systems Builder",
      score: averagePct(["J", "C", "EXEC", "WG_D", "WG_T"], traitTotals),
      summary: "Brings structure, consistency, and completion discipline."
    },
    {
      label: "Growth Driver",
      score: averagePct(["D", "N", "INFL", "WG_I", "WG_G"], traitTotals),
      summary: "Creates momentum, pushes change, and influences direction."
    },
    {
      label: "People Integrator",
      score: averagePct(["F", "REL", "S_DISC", "WG_E", "I_DISC"], traitTotals),
      summary: "Builds trust, alignment, and team reliability."
    },
    {
      label: "Strategic Operator",
      score: averagePct(["STRAT", "T", "C", "WG_D", "J"], traitTotals),
      summary: "Combines analytical thinking with operational execution."
    }
  ].sort((a, b) => b.score - a.score);

  return {
    answeredCount,
    totalQuestions: TOTAL_QUESTIONS,
    completionPct: Math.round((answeredCount / TOTAL_QUESTIONS) * 100),
    rapidFlag: durationMinutes < minDurationMinutes,
    traitTotals,
    mbti: {
      type: mbtiType,
      pairs: mbtiPairs
    },
    disc: {
      ranking: discRanking,
      primary: discRanking[0],
      secondary: discRanking[1]
    },
    strengths: {
      ranking: strengthsRanking,
      topTwo: strengthsRanking.slice(0, 2)
    },
    workingGenius: {
      ranking: geniusRanking,
      topTwo: geniusRanking.slice(0, 2),
      lowerEnergyTwo: geniusRanking.slice(-2).reverse()
    },
    archetypes,
    primaryArchetype: archetypes[0]
  };
}

function buildTraitTotals() {
  const totals = {};
  Object.keys(TRAIT_META).forEach((key) => {
    totals[key] = {
      trait: key,
      label: TRAIT_META[key].label,
      score: 0,
      count: 0,
      avg: 0,
      pct: 0
    };
  });
  return totals;
}

function rankTraits(traitKeys, traitTotals) {
  return traitKeys
    .map((key) => ({
      key,
      label: TRAIT_META[key].label,
      pct: Math.round(traitTotals[key].pct),
      avg: traitTotals[key].avg
    }))
    .sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct;
      return a.label.localeCompare(b.label);
    });
}

function averagePct(traits, traitTotals) {
  if (!traits.length) return 0;
  const total = traits.reduce((sum, trait) => sum + (traitTotals[trait]?.pct || 0), 0);
  return total / traits.length;
}

function createSubmissionId() {
  return `pers_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function storePath() {
  const configured = String(process.env.STORE_PATH || "").trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), "data", "personality-submissions.ndjson");
}

async function appendSubmission(record) {
  const target = storePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.appendFile(target, `${JSON.stringify(record)}\n`, "utf8");
}

async function readSubmissions(limit) {
  const target = storePath();
  const raw = await fs.readFile(target, "utf8").catch(() => "");
  if (!raw.trim()) return [];

  const rows = raw
    .trim()
    .split("\n")
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return rows.slice(-limit).reverse();
}

function filterByTestVersion(rows, testVersion) {
  if (!testVersion) return rows;
  return rows.filter((row) => String(row.testVersion || "").trim() === testVersion);
}

async function trySendSubmissionEmail(record) {
  if (!canSendEmail()) return false;

  const subject = `Personality Submission [${record.testVersion}] - ${record.candidateName} - ${record.profile.mbti.type}`;
  const body = formatSubmissionEmail(record);

  await sendViaGmailApi({
    from: required("EMAIL_FROM"),
    to: required("EMAIL_TO"),
    cc: String(process.env.EMAIL_CC || "").trim(),
    subject,
    body
  });

  return true;
}

function formatSubmissionEmail(record) {
  const p = record.profile;

  const mbtiSummary = p.mbti.pairs
    .map((x) => `${x.left}/${x.right} winner ${x.winner} (margin ${x.margin}%)`)
    .join("; ");

  const discSummary = p.disc.ranking.map((x) => `${x.label} ${x.pct}%`).join(", ");
  const strengthsSummary = p.strengths.ranking.map((x) => `${x.label} ${x.pct}%`).join(", ");
  const geniusSummary = p.workingGenius.ranking.map((x) => `${x.label} ${x.pct}%`).join(", ");

  return [
    `Submission ID: ${record.submissionId}`,
    `Candidate: ${record.candidateName}`,
    `Candidate Email: ${record.candidateEmail}`,
    `Track: ${record.roleLabel}`,
    `Test Version: ${record.testVersion}`,
    `Submitted At: ${record.submittedAt}`,
    `Duration Minutes: ${record.durationMinutes}`,
    `Answered: ${p.answeredCount}/${TOTAL_QUESTIONS} (${p.completionPct}%)`,
    `Rapid Completion Flag: ${p.rapidFlag ? "Yes" : "No"}`,
    `MBTI-Inspired Type: ${p.mbti.type}`,
    `DISC Primary: ${p.disc.primary.label} (${p.disc.primary.pct}%)`,
    `Top Strength Domains: ${p.strengths.topTwo.map((x) => x.label).join(", ")}`,
    `Top Working Genius: ${p.workingGenius.topTwo.map((x) => x.label).join(", ")}`,
    `Lower-Energy Genius Areas: ${p.workingGenius.lowerEnergyTwo.map((x) => x.label).join(", ")}`,
    `Primary Archetype: ${p.primaryArchetype.label} (${Math.round(p.primaryArchetype.score)}%)`,
    "",
    `MBTI Pair Detail: ${mbtiSummary}`,
    `DISC Detail: ${discSummary}`,
    `Strength Domain Detail: ${strengthsSummary}`,
    `Working Genius Detail: ${geniusSummary}`,
    "",
    "Note: This is an internal profile inspired by major frameworks, not an official licensed diagnostic instrument."
  ].join("\n");
}

function buildSubmissionCsv(rows) {
  const headers = [
    "submissionId",
    "receivedAt",
    "submittedAt",
    "testVersion",
    "candidateName",
    "candidateEmail",
    "durationMinutes",
    "answeredCount",
    "totalQuestions",
    "completionPct",
    "rapidFlag",
    "mbtiType",
    "discPrimary",
    "discSecondary",
    "strengthTopOne",
    "strengthTopTwo",
    "geniusTopOne",
    "geniusTopTwo",
    "geniusLowOne",
    "geniusLowTwo",
    "primaryArchetype",
    "primaryArchetypeScore"
  ];

  const lines = [headers.join(",")];

  rows.forEach((record) => {
    const p = record.profile || {};
    const disc = p.disc || {};
    const strengths = p.strengths || {};
    const genius = p.workingGenius || {};

    const row = [
      record.submissionId,
      record.receivedAt,
      record.submittedAt,
      record.testVersion,
      record.candidateName,
      record.candidateEmail,
      record.durationMinutes,
      p.answeredCount,
      p.totalQuestions,
      p.completionPct,
      p.rapidFlag,
      p.mbti?.type,
      disc.primary?.label,
      disc.secondary?.label,
      strengths.topTwo?.[0]?.label,
      strengths.topTwo?.[1]?.label,
      genius.topTwo?.[0]?.label,
      genius.topTwo?.[1]?.label,
      genius.lowerEnergyTwo?.[0]?.label,
      genius.lowerEnergyTwo?.[1]?.label,
      p.primaryArchetype?.label,
      p.primaryArchetype ? Math.round(p.primaryArchetype.score) : ""
    ];

    lines.push(row.map(csvEscape).join(","));
  });

  return lines.join("\n");
}

function parseLimit(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function canSendEmail() {
  return [
    "EMAIL_FROM",
    "EMAIL_TO",
    "GOOGLE_CLIENT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "GOOGLE_IMPERSONATED_USER"
  ].every((key) => String(process.env[key] || "").trim());
}

async function sendViaGmailApi({ from, to, cc, subject, body }) {
  const auth = new google.auth.JWT({
    email: required("GOOGLE_CLIENT_EMAIL"),
    key: normalizePrivateKey(required("GOOGLE_PRIVATE_KEY")),
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
    subject: required("GOOGLE_IMPERSONATED_USER")
  });

  const gmail = google.gmail({ version: "v1", auth });

  const rawMessage = [
    `From: ${from}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : "",
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body
  ]
    .filter(Boolean)
    .join("\r\n");

  const encoded = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded }
  });

  return response.data.id;
}

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) fail(500, `Missing required env var: ${name}`);
  return value;
}

function normalizePrivateKey(key) {
  return key.replace(/\\n/g, "\n");
}

function normalizeTestVersion(value) {
  const cleaned = String(value || "").trim().slice(0, MAX_TEST_VERSION_LEN);
  if (!cleaned) return DEFAULT_TEST_VERSION;
  return cleaned.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isValidEmailFormat(email) {
  return EMAIL_REGEX.test(String(email || "").trim().toLowerCase());
}

function suggestEmailCorrection(email) {
  const parts = String(email || "").trim().toLowerCase().split("@");
  if (parts.length !== 2) return "";

  const local = parts[0];
  const domain = parts[1].toLowerCase();

  if (EMAIL_TYPO_MAP[domain]) {
    return `${local}@${EMAIL_TYPO_MAP[domain]}`;
  }

  if (COMMON_EMAIL_DOMAINS.includes(domain)) return "";

  const closest = findClosestKnownDomain(domain);
  if (!closest) return "";

  return `${local}@${closest}`;
}

function findClosestKnownDomain(domain) {
  let best = "";
  let bestDistance = Number.POSITIVE_INFINITY;

  COMMON_EMAIL_DOMAINS.forEach((candidate) => {
    const d = levenshtein(domain, candidate);
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  });

  if (bestDistance <= 1) return best;
  if (bestDistance === 2 && Math.abs(domain.length - best.length) <= 1) return best;
  return "";
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

function enforceJsonRequest(req) {
  const method = String(req.method || "").toUpperCase();
  if (method !== "POST") return;

  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    fail(415, "Content-Type must be application/json");
  }
}

function enforceRateLimit(req, label, maxCount, windowMs) {
  const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown");
  const now = Date.now();
  const key = `${label}:${ip}`;

  let bucket = RATE_BUCKETS.get(key);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
  }

  bucket.count += 1;
  RATE_BUCKETS.set(key, bucket);

  if (bucket.count > maxCount) {
    fail(429, "Rate limit exceeded");
  }
}

function timingSafeEqual(expected, received) {
  const a = Buffer.from(String(expected || ""));
  const b = Buffer.from(String(received || ""));

  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function parseBoolEnv(name, fallback) {
  const raw = String(process.env[name] || "").trim().toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
}

function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

app.listen(port, () => {
  console.log(`Personality backend listening on http://localhost:${port}`);
});
