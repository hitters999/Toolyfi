#!/usr/bin/env node
/**
 * Toolyfi Reddit Draft Queue
 *
 * Draft-only by design. This script never logs in to Reddit and never publishes,
 * comments, votes, sends DMs, or changes Reddit content.
 *
 * Usage:
 *   node scripts/reddit-draft.js \
 *     --input reddit/threads.example.json \
 *     --output reddit/draft-queue.md
 *
 * Optional environment variables:
 *   OPENAI_API_KEY / OPENAI_API_BASE: built-in OpenAI-compatible proxy
 *   DRAFT_MODEL: defaults to gpt-5-mini when OPENAI_API_KEY is present
 *   GEMINI_API_KEY: external Gemini fallback compatible with the existing repo
 *   MAX_DRAFTS: default 10
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DEFAULT_INPUT = path.join(ROOT, 'reddit', 'threads.json');
const DEFAULT_OUTPUT = path.join(ROOT, 'reddit', 'draft-queue.md');
const DEFAULT_CATALOG = path.join(ROOT, 'reddit', 'tool-catalog.json');
const DEFAULT_RULES = path.join(ROOT, 'reddit', 'subreddit-rules.json');
const MAX_DRAFTS = Number(process.env.MAX_DRAFTS || 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = (process.env.OPENAI_API_BASE || 'https://api.openai.com/v1').replace(/\/$/, '');
const DRAFT_MODEL = process.env.DRAFT_MODEL || 'gpt-5-mini';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeText(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function cleanText(value, max = 6000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeSubreddit(value) {
  return String(value || '').replace(/^r\//i, '').trim().toLowerCase();
}

function tokenize(value) {
  return cleanText(value, 12000)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\- ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function daysOld(createdAt) {
  const time = Date.parse(createdAt || '');
  if (!Number.isFinite(time)) return 9999;
  return Math.max(0, (Date.now() - time) / 86400000);
}

function getRule(rules, subreddit) {
  return rules?.subreddits?.[normalizeSubreddit(subreddit)] || {
    allow_links: false,
    notes: 'No local rule confirmation. Do not include a Toolyfi link until the subreddit rules are checked manually.'
  };
}

function findTool(thread, catalog) {
  const text = tokenize([thread.title, thread.body, thread.comments].join(' '));
  const textSet = new Set(text);
  let best = null;
  for (const tool of catalog.tools || []) {
    const matched = (tool.keywords || []).filter((keyword) => {
      const words = tokenize(keyword);
      return words.length > 0 && words.every((word) => textSet.has(word));
    });
    const partial = (tool.keywords || []).filter((keyword) =>
      cleanText([thread.title, thread.body].join(' ')).toLowerCase().includes(keyword.toLowerCase())
    );
    const score = matched.length * 2 + partial.length;
    if (score > (best?.matchScore || 0)) {
      best = { tool, matchScore: score, matchedKeywords: [...new Set([...matched, ...partial])] };
    }
  }
  return best;
}

function scoreThread(thread, match, rule) {
  if (!match) return { score: 0, reasons: ['No Toolyfi tool matched the thread.'] };
  const reasons = [];
  let score = 0;
  if (match.matchScore >= 2) { score += 3; reasons.push('strong tool/problem keyword match'); }
  else if (match.matchScore === 1) { score += 1; reasons.push('weak keyword match'); }
  if (/[?]|how can|how do|why does|what is|help me|any advice/i.test(`${thread.title} ${thread.body}`)) {
    score += 2; reasons.push('question or help-seeking intent');
  }
  const age = daysOld(thread.created_at);
  if (age <= 7) { score += 2; reasons.push('thread is less than 7 days old'); }
  else if (age <= 30) { score += 1; reasons.push('thread is less than 30 days old'); }
  const comments = Number(thread.comment_count || 0);
  if (comments <= 5) { score += 1; reasons.push('low comment count'); }
  else if (comments >= 50) { score -= 2; reasons.push('discussion is already crowded'); }
  if (rule.allow_links === true) { score += 2; reasons.push('local rules file allows a link'); }
  else { reasons.push('link not allowed by local rules file or not yet confirmed'); }
  if (/\b(buy|sale|discount|promo|promote|affiliate|client|customer acquisition)\b/i.test(`${thread.title} ${thread.body}`)) {
    score -= 4; reasons.push('promotional or commercial intent detected');
  }
  return { score, reasons };
}

function fallbackDraft(thread, match, rule) {
  const tool = match.tool;
  const answer = tool.answer_points?.slice(0, 3).join('. ') || tool.summary;
  const link = rule.allow_links === true ? `\n\nIf it helps, I work on Toolyfi, and its ${tool.name} is here: ${tool.url}` : '';
  const disclosure = rule.allow_links === true ? '\n\nI work on Toolyfi, so this is a self-recommendation; please ignore the link if it is not useful.' : '';
  return {
    reply: `A practical way to approach this is to ${answer.charAt(0).toLowerCase()}${answer.slice(1)}. I would test the smallest example first, keep the original input unchanged, and verify the result against the expected output before using it in production.${link}${disclosure}`,
    should_include_link: rule.allow_links === true,
    rationale: `The thread matches ${tool.name} because of: ${(match.matchedKeywords || []).join(', ')}.`,
    risk_notes: tool.sensitive_topic ? 'This topic may require jurisdiction-specific or professional guidance; keep the answer general and verify the result independently.' : 'Keep the answer specific to the question and do not make unsupported product claims.'
  };
}

function responseSchema() {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'reddit_draft',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          reply: { type: 'string' },
          should_include_link: { type: 'boolean' },
          rationale: { type: 'string' },
          risk_notes: { type: 'string' }
        },
        required: ['reply', 'should_include_link', 'rationale', 'risk_notes'],
        additionalProperties: false
      }
    }
  };
}

function draftPrompt(thread, match, rule) {
  const tool = match.tool;
  const linkAllowed = rule.allow_links === true;
  return `You write one helpful Reddit reply for Toolyfi.com. This is a DRAFT ONLY; it will be reviewed by a human and must not contain instructions to post, vote, DM, evade moderation, or bypass platform controls.

Write in clear, natural American English. Answer the user's actual question first. Do not say "Great question". Do not use generic marketing language. Do not invent features, prices, accuracy, privacy, or guarantees. Do not pretend to be an independent user. If mentioning Toolyfi, disclose the affiliation plainly.

Thread subreddit: r/${normalizeSubreddit(thread.subreddit)}
Thread title: ${cleanText(thread.title)}
Thread body: ${cleanText(thread.body)}
Existing comments: ${cleanText(thread.comments, 4500) || '(none supplied)'}

Best-matching Toolyfi tool: ${tool.name}
Tool summary: ${tool.summary}
Verified answer points: ${(tool.answer_points || []).join('; ')}
Tool URL: ${tool.url}

Local link permission: ${linkAllowed ? 'allowed in the local rules file' : 'not confirmed; do not include a link'}
Local rules note: ${cleanText(rule.notes)}

Return JSON only with: reply, should_include_link, rationale, risk_notes. The reply should be concise but genuinely useful. Set should_include_link to false unless the link is materially helpful AND local link permission is allowed.`;
}

async function openAiDraft(thread, match, rule) {
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: DRAFT_MODEL,
      messages: [
        { role: 'system', content: 'Return valid JSON only. Be helpful, transparent, and conservative about self-promotion.' },
        { role: 'user', content: draftPrompt(thread, match, rule) }
      ],
      response_format: responseSchema(),
      max_completion_tokens: 900
    })
  });
  if (!response.ok) throw new Error(`OpenAI-compatible API ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

async function geminiDraft(thread, match, rule) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${draftPrompt(thread, match, rule)}\n\nReturn ONLY a JSON object, without markdown fences.` }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
    })
  });
  if (!response.ok) throw new Error(`Gemini API ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function createDraft(thread, match, rule) {
  if (OPENAI_API_KEY) return openAiDraft(thread, match, rule);
  if (GEMINI_API_KEY) return geminiDraft(thread, match, rule);
  return fallbackDraft(thread, match, rule);
}

function enforceGuardrails(draft, match, rule) {
  const result = {
    reply: cleanText(draft.reply, 3000),
    should_include_link: Boolean(draft.should_include_link) && rule.allow_links === true,
    rationale: cleanText(draft.rationale, 600),
    risk_notes: cleanText(draft.risk_notes, 600)
  };
  if (!result.reply) result.reply = fallbackDraft({ title: '', body: '' }, match, rule).reply;
  if (!result.should_include_link) {
    result.reply = result.reply.replace(/https?:\/\/[^\s)]+/gi, '').replace(/\n{3,}/g, '\n\n').trim();
  } else if (!/toolyfi/i.test(result.reply)) {
    result.reply += `\n\nI work on Toolyfi, so this is a self-recommendation: ${match.tool.url}`;
  }
  if (match.tool.sensitive_topic) {
    result.risk_notes = `${result.risk_notes} This is a sensitive topic; keep the reply general and ask the reader to verify important decisions with an appropriate professional or official source.`.trim();
  }
  return result;
}

function markdownQueue(items, metadata) {
  const generatedAt = new Date().toISOString();
  const lines = [
    '# Toolyfi Reddit Draft Queue',
    '',
    '> Draft-only output. Nothing in this file is automatically published, voted on, messaged, or submitted to Reddit.',
    '',
    `Generated: ${generatedAt}`,
    `Input: ${metadata.input}`,
    `Draft model: ${metadata.model}`,
    '',
    '## Review rules',
    '',
    'Review the current subreddit rules and the full thread before using any draft. Edit for accuracy and tone. Do not publish a link unless the subreddit permits it and the Toolyfi affiliation is transparent. If the answer does not add real value, mark it SKIP.',
    '',
    '## Candidates',
    ''
  ];
  if (!items.length) lines.push('No candidates met the minimum score.');
  items.forEach((item, index) => {
    lines.push(`### ${index + 1}. ${item.thread.title || '(untitled thread)'}`);
    lines.push('');
    lines.push(`- **Status:** NEEDS_REVIEW`);
    lines.push(`- **Subreddit:** r/${item.thread.subreddit}`);
    lines.push(`- **Thread:** ${item.thread.url}`);
    lines.push(`- **Score:** ${item.score}`);
    lines.push(`- **Matched tool:** ${item.match.tool.name} — ${item.match.tool.url}`);
    lines.push(`- **Matched keywords:** ${item.match.matchedKeywords.join(', ') || 'none recorded'}`);
    lines.push(`- **Scoring reasons:** ${item.reasons.join('; ')}`);
    lines.push(`- **Link decision:** ${item.draft.should_include_link ? 'Candidate includes a link; verify rules and disclosure before use.' : 'No link in draft.'}`);
    lines.push(`- **Risk notes:** ${item.draft.risk_notes || 'None recorded.'}`);
    lines.push('');
    lines.push('**Proposed reply:**');
    lines.push('');
    lines.push(item.draft.reply || 'SKIP');
    lines.push('');
    lines.push('**Reviewer decision:** `APPROVE` / `EDIT` / `REJECT` / `SKIP`');
    lines.push('');
  });
  return `${lines.join('\n')}\n`;
}

async function main() {
  const input = arg('--input', DEFAULT_INPUT);
  const output = arg('--output', DEFAULT_OUTPUT);
  const catalogFile = arg('--catalog', DEFAULT_CATALOG);
  const rulesFile = arg('--rules', DEFAULT_RULES);
  const minScore = Number(arg('--min-score', 5));

  if (!fs.existsSync(input)) {
    throw new Error(`Input file not found: ${input}. Copy reddit/threads.example.json to reddit/threads.json or pass --input.`);
  }
  const threads = readJson(input, []);
  const catalog = readJson(catalogFile, { tools: [] });
  const rules = readJson(rulesFile, { subreddits: {} });
  if (!Array.isArray(threads)) throw new Error('Input must be a JSON array of thread objects.');

  const seen = new Set();
  const candidates = [];
  for (const thread of threads) {
    if (!thread.url || !/^https?:\/\/(www\.)?reddit\.com\//i.test(thread.url)) continue;
    const key = thread.id || thread.url;
    if (seen.has(key)) continue;
    seen.add(key);
    const match = findTool(thread, catalog);
    const rule = getRule(rules, thread.subreddit);
    const scored = scoreThread(thread, match, rule);
    if (match && scored.score >= minScore) candidates.push({ thread, match, rule, ...scored });
  }
  candidates.sort((a, b) => b.score - a.score || daysOld(a.thread.created_at) - daysOld(b.thread.created_at));

  const selected = candidates.slice(0, MAX_DRAFTS);
  const items = [];
  for (const item of selected) {
    let draft;
    try {
      draft = await createDraft(item.thread, item.match, item.rule);
    } catch (error) {
      console.warn(`Draft generation failed for ${item.thread.url}: ${error.message}`);
      draft = fallbackDraft(item.thread, item.match, item.rule);
    }
    items.push({ ...item, draft: enforceGuardrails(draft, item.match, item.rule) });
  }

  const model = OPENAI_API_KEY ? DRAFT_MODEL : GEMINI_API_KEY ? GEMINI_MODEL : 'deterministic fallback (no API key)';
  writeText(output, markdownQueue(items, { input, model }));
  console.log(`Wrote ${items.length} draft candidates to ${output}`);
  console.log('Publishing is intentionally not implemented. Review each candidate manually.');
}

main().catch((error) => {
  console.error(`Reddit draft workflow failed: ${error.message}`);
  process.exit(1);
});
