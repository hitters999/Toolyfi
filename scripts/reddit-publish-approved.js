#!/usr/bin/env node
/**
 * Toolyfi Reddit publisher — comments only, disabled by default.
 *
 * This script publishes only items that are explicitly marked approved in a
 * local JSON queue. It never creates posts, sends DMs, votes, or uses multiple
 * accounts. A live call requires all three switches:
 *   --live
 *   REDDIT_POSTING_ENABLED=true
 *   AUTO_POST_CONFIRM=YES_I_CONFIRM
 *
 * Dry run:
 *   node scripts/reddit-publish-approved.js \
 *     --input reddit/approved-posts.example.json \
 *     --state /tmp/toolyfi-reddit-state.json
 *
 * Live mode requires an authorized OAuth access token with the `submit` scope.
 * Do not put tokens in files or command arguments.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DEFAULT_INPUT = path.join(ROOT, 'reddit', 'approved-posts.json');
const DEFAULT_STATE = path.join(ROOT, 'reddit', 'publish-state.json');
const API_BASE = (process.env.REDDIT_API_BASE || 'https://oauth.reddit.com').replace(/\/$/, '');
const USER_AGENT = process.env.REDDIT_USER_AGENT || 'ToolyfiRedditPublisher/1.0 by Toolyfi owner';
const MIN_SECONDS_BETWEEN_POSTS = Number(process.env.MIN_SECONDS_BETWEEN_POSTS || 86400);
const MAX_POSTS_PER_RUN = Number(process.env.MAX_POSTS_PER_RUN || 1);
const ALLOWED_SUBREDDITS = new Set(
  String(process.env.REDDIT_ALLOWED_SUBREDDITS || '')
    .split(',')
    .map((value) => value.trim().replace(/^r\//i, '').toLowerCase())
    .filter(Boolean)
);

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function normalizeSubreddit(value) {
  return String(value || '').trim().replace(/^r\//i, '').toLowerCase();
}

function cleanText(value) {
  return String(value || '').replace(/\r/g, '').trim();
}

function requireValidQueue(queue) {
  if (!queue || typeof queue !== 'object' || !Array.isArray(queue.posts)) {
    throw new Error('Input must be a JSON object with a posts array.');
  }
  if (queue.enabled === false) {
    throw new Error('Queue is disabled. Set enabled:true only after reviewing the queue.');
  }
}

function validateCandidate(post) {
  const errors = [];
  const subreddit = normalizeSubreddit(post.subreddit);
  const text = cleanText(post.text);
  if (!post.id) errors.push('missing id');
  if (!/^t[13]_[a-z0-9]+$/i.test(String(post.thing_id || ''))) errors.push('thing_id must be a Reddit fullname such as t3_... or t1_...');
  if (!post.url || !/^https?:\/\/(www\.)?reddit\.com\//i.test(post.url)) errors.push('missing or invalid reddit.com thread URL');
  if (!subreddit || !ALLOWED_SUBREDDITS.has(subreddit)) errors.push(`subreddit r/${subreddit || '(missing)'} is not on the local allowlist`);
  if (post.approved !== true) errors.push('approved must be true');
  if (!post.approved_at) errors.push('approved_at is required');
  if (!post.approved_by) errors.push('approved_by is required');
  if (text.length < 80) errors.push('text is too short to be a substantive reply');
  if (text.length > 10000) errors.push('text is too long');
  if (/https?:\/\/[^\s]+/gi.test(text) && !/toolyfi\.com/i.test(text)) errors.push('external links are not allowed by this publisher');
  if (/\b(buy now|limited offer|click here|subscribe|upvote|dm me|direct message)\b/i.test(text)) errors.push('promotional or manipulation language detected');
  if (/toolyfi\.com/i.test(text) && !/work (on|at) toolyfi|self[- ]recommendation|affiliation/i.test(text)) errors.push('Toolyfi link requires transparent affiliation disclosure');
  return { errors, subreddit, text };
}

function loadState(file) {
  const state = readJson(file, { published_ids: {}, last_published_at_by_subreddit: {}, emergency_stop: false });
  state.published_ids ||= {};
  state.last_published_at_by_subreddit ||= {};
  state.emergency_stop = Boolean(state.emergency_stop);
  return state;
}

function canPost(post, state, now) {
  if (state.emergency_stop) return { ok: false, reason: 'emergency stop is active in publish-state.json' };
  if (state.published_ids[post.id]) return { ok: false, reason: 'candidate id was already published according to state' };
  const last = Date.parse(state.last_published_at_by_subreddit[normalizeSubreddit(post.subreddit)] || '');
  if (Number.isFinite(last) && (now - last) / 1000 < MIN_SECONDS_BETWEEN_POSTS) {
    return { ok: false, reason: `subreddit cooldown is active; minimum is ${MIN_SECONDS_BETWEEN_POSTS} seconds` };
  }
  return { ok: true };
}

async function verifyAccount() {
  const token = process.env.REDDIT_ACCESS_TOKEN;
  if (!token) throw new Error('REDDIT_ACCESS_TOKEN is required for live mode.');
  const response = await fetch(`${API_BASE}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT }
  });
  if (!response.ok) throw new Error(`Reddit account check failed with HTTP ${response.status}: ${await response.text()}`);
  const account = await response.json();
  if (process.env.REDDIT_USERNAME && account.name !== process.env.REDDIT_USERNAME) {
    throw new Error(`Authorized account mismatch: expected ${process.env.REDDIT_USERNAME}, received ${account.name}`);
  }
  return account.name || 'authorized account';
}

async function submitComment(post) {
  const token = process.env.REDDIT_ACCESS_TOKEN;
  const form = new URLSearchParams({
    api_type: 'json',
    thing_id: post.thing_id,
    text: post.text
  });
  const response = await fetch(`${API_BASE}/api/comment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Reddit comment submission failed with HTTP ${response.status}: ${JSON.stringify(data)}`);
  const errors = data?.json?.errors || [];
  if (errors.length) throw new Error(`Reddit rejected the comment: ${JSON.stringify(errors)}`);
  return data;
}

async function main() {
  const input = arg('--input', DEFAULT_INPUT);
  const stateFile = arg('--state', DEFAULT_STATE);
  const live = process.argv.includes('--live');
  const queue = readJson(input, null);
  requireValidQueue(queue);
  const state = loadState(stateFile);

  if (live && process.env.REDDIT_POSTING_ENABLED !== 'true') {
    throw new Error('Live mode blocked: set REDDIT_POSTING_ENABLED=true only after confirming the configuration.');
  }
  if (live && process.env.AUTO_POST_CONFIRM !== 'YES_I_CONFIRM') {
    throw new Error('Live mode blocked: set AUTO_POST_CONFIRM=YES_I_CONFIRM only when you intentionally want to publish.');
  }
  if (live && !String(process.env.REDDIT_OAUTH_SCOPE || '').split(/\s+/).includes('submit')) {
    throw new Error('Live mode blocked: REDDIT_OAUTH_SCOPE must explicitly include submit.');
  }

  const now = Date.now();
  const eligible = [];
  const rejected = [];
  for (const post of queue.posts) {
    const validation = validateCandidate(post);
    if (validation.errors.length) {
      rejected.push({ id: post.id || '(missing)', reasons: validation.errors });
      continue;
    }
    const cooldown = canPost(post, state, now);
    if (!cooldown.ok) {
      rejected.push({ id: post.id, reasons: [cooldown.reason] });
      continue;
    }
    eligible.push({ ...post, subreddit: validation.subreddit, text: validation.text });
  }

  const selected = eligible.slice(0, Math.max(0, MAX_POSTS_PER_RUN));
  console.log(JSON.stringify({ mode: live ? 'LIVE' : 'DRY_RUN', selected: selected.map((post) => ({ id: post.id, subreddit: post.subreddit, url: post.url })), rejected }, null, 2));

  if (!live) {
    console.log('Dry run complete. No Reddit API write was attempted.');
    return;
  }

  const account = await verifyAccount();
  console.log(`Verified authorized Reddit account: ${account}`);
  for (const post of selected) {
    const result = await submitComment(post);
    state.published_ids[post.id] = {
      published_at: new Date().toISOString(),
      subreddit: post.subreddit,
      thread_url: post.url,
      response_id: result?.json?.data?.things?.[0]?.data?.id || null
    };
    state.last_published_at_by_subreddit[post.subreddit] = new Date().toISOString();
    writeJson(stateFile, state);
    console.log(`Published approved comment ${post.id} to r/${post.subreddit}.`);
  }
}

main().catch((error) => {
  console.error(`Reddit publisher stopped safely: ${error.message}`);
  process.exit(1);
});
