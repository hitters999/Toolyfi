# Toolyfi Reddit Draft Queue

This directory contains the **Option A, English, draft-only** workflow for Toolyfi.com. It is designed to help find relevant Reddit discussions and prepare useful replies without automatically publishing, voting, messaging, or modifying anything on Reddit.

## Why it is draft-only

Toolyfi is a public repository, so raw Reddit thread content should not be committed to the repository. The workflow accepts an input file on a secure local machine or approved private runner and writes a review queue. The repository intentionally contains only an example input file. Do not commit real Reddit exports, private messages, credentials, OAuth tokens, or raw user data.

Before using any thread, manually check the current subreddit rules and read the complete discussion. Reddit's own self-promotion guidance says not to blindly submit links, to be transparent about affiliation, and to participate as a useful community member. The workflow therefore defaults to no link unless a local rules file explicitly marks a subreddit as link-permitting.

## Files

| File | Purpose |
|---|---|
| `tool-catalog.json` | Verified Toolyfi tools, URLs, problem keywords, and answer points. |
| `threads.example.json` | Safe example input format. Copy it to `threads.json` only for local testing, or provide another input path. |
| `subreddit-rules.example.json` | Template for manually confirmed subreddit link rules. Copy to `subreddit-rules.json` and update only after checking each subreddit. |
| `../scripts/reddit-draft.js` | Discovery-from-input, scoring, English drafting, and guardrail enforcement. |

## Local run

From the repository root:

```bash
cp reddit/threads.example.json reddit/threads.json
cp reddit/subreddit-rules.example.json reddit/subreddit-rules.json
node scripts/reddit-draft.js \
  --input reddit/threads.json \
  --rules reddit/subreddit-rules.json \
  --output reddit/draft-queue.md
```

Without an LLM key, the script uses a deterministic fallback draft so the workflow can be tested safely. For better English drafts, run it on a secure machine with the built-in OpenAI-compatible proxy environment variables `OPENAI_API_KEY` and `OPENAI_API_BASE`; the default model is `gpt-5-mini`, which is intended for cost-efficient bulk drafting. Alternatively, the existing repository's Gemini key can be used with `GEMINI_API_KEY`.

Example with the built-in model:

```bash
OPENAI_API_KEY="$OPENAI_API_KEY" \
OPENAI_API_BASE="$OPENAI_API_BASE" \
node scripts/reddit-draft.js \
  --input /secure/path/threads.json \
  --rules /secure/path/subreddit-rules.json \
  --output /secure/path/draft-queue.md
```

## Input format

Each thread object should contain `id`, `url`, `subreddit`, `title`, `body`, optional `comments`, optional ISO `created_at`, optional numeric `comment_count`, and a `source` field describing how the data was obtained. Only `reddit.com` URLs are accepted. Use an authorized or permitted source, and do not use proxy rotation, CAPTCHA bypass, fingerprint masking, or any method intended to evade Reddit controls.

## Review process

The output is a Markdown queue. For each candidate, review the full original thread, confirm the subreddit rules, edit the proposed reply for accuracy and tone, and choose `APPROVE`, `EDIT`, `REJECT`, or `SKIP`. “Approve” means ready for a human to post manually; it does not trigger posting. If a link is included, disclose the Toolyfi affiliation and confirm that the link is allowed. If the draft does not add meaningful value, choose `SKIP`.

## Safety boundaries

The script does not contain a Reddit login, OAuth publisher, comment endpoint, vote endpoint, DM endpoint, or browser automation. It cannot publish anything. It must not be extended into auto-upvotes, mass DMs, repetitive bulk posting, multiple-account manipulation, ban evasion, or artificial behavior intended to circumvent moderation.

Financial, tax, health, legal, and other sensitive topics require extra care. Keep replies general, state assumptions, avoid personalized advice, and direct readers to official or qualified sources where appropriate. Tool capability and privacy claims must remain consistent with the actual Toolyfi implementation.

## Suggested first test

Use the included JSON example. The expected output should contain one `NEEDS_REVIEW` candidate matched to JSON Formatter, with an English answer and no link because the example subreddit rule is set to `allow_links: false`.
