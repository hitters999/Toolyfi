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
| `approved-posts.example.json` | Example of the only queue shape accepted by the publisher. |
| `../scripts/reddit-publish-approved.js` | Authorized comment publisher, disabled by default and limited to allowlisted subreddits. |

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

The output is a Markdown queue. For each candidate, review the full original thread, confirm the subreddit rules, edit the proposed reply for accuracy and tone, and choose `APPROVE`, `EDIT`, `REJECT`, or `SKIP`. If a link is included, disclose the Toolyfi affiliation and confirm that the link is allowed. If the draft does not add meaningful value, choose `SKIP`.

For automatic comments, a human must first create a separate `approved-posts.json` queue in the format shown by `approved-posts.example.json`. Every item must include a Reddit fullname such as `t3_...` or `t1_...`, the complete thread URL, `approved: true`, an approval timestamp, an approver name, and the final text. The publisher rejects items that are not explicitly approved.

## Automatic publisher: disabled by default

The publisher is intentionally a separate step from drafting. A dry run is safe and requires no Reddit credentials:

```bash
node scripts/reddit-publish-approved.js \
  --input reddit/approved-posts.example.json \
  --state /tmp/toolyfi-reddit-state.json
```

Live mode is blocked unless all of these are intentionally configured on a private runner: an OAuth access token with the `submit` scope, `REDDIT_POSTING_ENABLED=true`, `AUTO_POST_CONFIRM=YES_I_CONFIRM`, `REDDIT_OAUTH_SCOPE=submit`, and `--live`. The publisher verifies the authorized account, accepts only allowlisted subreddits, prevents duplicate candidate IDs, enforces a one-post-per-subcommunity cooldown by default, rejects promotional or vote-manipulation language, and stops when the state file has `emergency_stop: true`.

Example live invocation, only after Reddit commercial approval and authorized credentials are in place:

```bash
REDDIT_ACCESS_TOKEN="$REDDIT_ACCESS_TOKEN" \
REDDIT_USERNAME="your_reddit_username" \
REDDIT_OAUTH_SCOPE="submit" \
REDDIT_ALLOWED_SUBREDDITS="learnprogramming,webdev,seo" \
REDDIT_POSTING_ENABLED=true \
AUTO_POST_CONFIRM=YES_I_CONFIRM \
node scripts/reddit-publish-approved.js \
  --input /secure/path/approved-posts.json \
  --state /secure/path/publish-state.json \
  --live
```

Do not run that command yet without Reddit's required commercial permission and a deliberate review of the allowlist. The current public GitHub repository must not contain access tokens, real Reddit exports, or a persistent state file.

## Safety boundaries

The draft script does not contain a Reddit login, OAuth publisher, vote endpoint, DM endpoint, or browser automation. The separate publisher contains only the official comment endpoint and is disabled by default. It must not be extended into auto-upvotes, mass DMs, repetitive bulk posting, multiple-account manipulation, ban evasion, or artificial behavior intended to circumvent moderation.

Financial, tax, health, legal, and other sensitive topics require extra care. Keep replies general, state assumptions, avoid personalized advice, and direct readers to official or qualified sources where appropriate. Tool capability and privacy claims must remain consistent with the actual Toolyfi implementation.

## Suggested first test

Use the included JSON example. The expected output should contain one `NEEDS_REVIEW` candidate matched to JSON Formatter, with an English answer and no link because the example subreddit rule is set to `allow_links: false`.
