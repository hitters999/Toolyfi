/**
 * ============================================================
 *  Toolyfi — Updates World Auto Article Loader
 *  Scans GitHub repo for articles, reads their meta tags,
 *  and auto-generates cards + animation cards.
 * ============================================================
 *
 *  HOW TO USE:
 *  1. Add this script to updatesworld.html
 *  2. Each article HTML must have these meta tags:
 *
 *     <meta name="uw-title"       content="Your Article Title">
 *     <meta name="uw-description" content="Short description here">
 *     <meta name="uw-badge"       content="🤖 AI & TECH">
 *     <meta name="uw-image"       content="https://images.unsplash.com/...">
 *     <meta name="uw-date"        content="March 2026">
 *     <meta name="uw-category"    content="technology">
 *
 *  3. Upload article to updatesworld/ folder on GitHub
 *  4. Done — cards auto-appear!
 * ============================================================
 */

(function () {

  // ── CONFIG ──────────────────────────────────────────────
  const GITHUB_USER = "hitters999";
  const GITHUB_REPO = "Toolyfi";
  const FOLDER_PATH = "updatesworld";
  const BRANCH = "main";

  // Files to skip (not articles)
  const SKIP_FILES = [
    "updatesworld.html",
    "gallery.html",
    "articles-loader.js",
    "article-feed-auto.js"
  ];

  // Fallback image if article has none
  const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=200&fit=crop";

  // ── GITHUB API: Get file list ────────────────────────────
  async function getArticleFiles() {
    const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FOLDER_PATH}?ref=${BRANCH}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("GitHub API failed");
      const files = await res.json();
      return files
        .filter(f => f.name.endsWith(".html") && !SKIP_FILES.includes(f.name))
        .sort((a, b) => b.name.localeCompare(a.name)); // newest first by name
    } catch (e) {
      console.warn("Articles Loader: Could not fetch file list.", e);
      return [];
    }
  }

  // ── FETCH + PARSE meta tags from article HTML ────────────
  async function getArticleMeta(file) {
    try {
      // Use raw GitHub content
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}/${FOLDER_PATH}/${file.name}`;
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error("Fetch failed");
      const html = await res.text();

      const get = (name) => {
        const match = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))
                   || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"));
        return match ? match[1] : null;
      };

      // Also try og: tags as fallback
      const getOg = (prop) => {
        const match = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
                   || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i"));
        return match ? match[1] : null;
      };

      return {
        filename: file.name,
        href: `${file.name}`,
        title:       get("uw-title")       || getOg("title")       || file.name.replace(/-/g, " ").replace(".html", ""),
        description: get("uw-description") || getOg("description") || "Read the full article on Updates World.",
        badge:       get("uw-badge")       || "📰 NEWS",
        image:       get("uw-image")       || getOg("image")       || FALLBACK_IMAGE,
        date:        get("uw-date")        || "2026",
        category:    get("uw-category")    || "general",
      };
    } catch (e) {
      console.warn(`Articles Loader: Could not parse ${file.name}`, e);
      return null;
    }
  }

  // ── BUILD featured card HTML ─────────────────────────────
  function buildFeaturedCard(meta) {
    return `
      <div class="featured-card auto-card" data-category="${meta.category}">
        <img src="${meta.image}" alt="${meta.title}" class="featured-card-image" onerror="this.src='${FALLBACK_IMAGE}'">
        <div class="featured-card-content">
          <span class="featured-card-badge">${meta.badge}</span>
          <h3 class="featured-card-title">${meta.title}</h3>
          <p class="featured-card-desc">${meta.description}</p>
          <a href="${meta.href}" class="featured-card-link">Read Full Article →</a>
        </div>
      </div>`;
  }

  // ── BUILD animation card HTML (3 latest) ────────────────
  function buildAnimCard(meta, index) {
    const icons = ["🔴", "⚡", "🌍", "📡", "🧠", "🔥"];
    const icon = icons[index % icons.length];
    return `
      <div class="animated-news-card auto-anim-card">
        <div class="news-card-icon">${icon}</div>
        <div class="news-card-title">${meta.title}</div>
        <div class="news-card-content">${meta.description}</div>
        <div class="news-card-time">
          <a href="${meta.href}" style="color:#d32f2f; text-decoration:none; font-weight:bold;">Read Now →</a>
          &nbsp;·&nbsp; ${meta.date}
        </div>
      </div>`;
  }

  // ── INJECT CARDS ─────────────────────────────────────────
  function injectFeaturedCards(articles) {
    const container = document.getElementById("auto-featured-cards");
    if (!container) return;
    container.innerHTML = articles.map(buildFeaturedCard).join("");
  }

  function injectAnimCards(articles) {
    const container = document.getElementById("auto-anim-cards");
    if (!container) return;
    const latest3 = articles.slice(0, 3);
    container.innerHTML = latest3.map(buildAnimCard).join("");
  }

  // ── LOADING SKELETON ─────────────────────────────────────
  function showLoading(containerId, count = 3) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = Array(count).fill(`
      <div class="featured-card" style="opacity:0.5;">
        <div style="background:#e0e0e0; height:180px; border-radius:10px 10px 0 0; animation: pulse 1.2s infinite;"></div>
        <div class="featured-card-content">
          <div style="background:#e0e0e0; height:14px; border-radius:4px; margin-bottom:10px; animation: pulse 1.2s infinite;"></div>
          <div style="background:#e0e0e0; height:20px; border-radius:4px; margin-bottom:8px; animation: pulse 1.2s infinite;"></div>
          <div style="background:#e0e0e0; height:14px; border-radius:4px; animation: pulse 1.2s infinite;"></div>
        </div>
      </div>`).join("");
  }

  // ── MAIN ─────────────────────────────────────────────────
  async function init() {
    // Show loading skeletons
    showLoading("auto-featured-cards", 3);

    // 1. Get file list from GitHub
    const files = await getArticleFiles();
    if (!files.length) {
      document.getElementById("auto-featured-cards").innerHTML =
        `<p style="color:#999; text-align:center; padding:20px;">No articles found.</p>`;
      return;
    }

    // 2. Fetch meta from each file (parallel)
    const metas = await Promise.all(files.map(getArticleMeta));
    const articles = metas.filter(Boolean); // remove nulls

    // 3. Inject cards
    injectFeaturedCards(articles);
    injectAnimCards(articles);

    console.log(`✅ Updates World: Loaded ${articles.length} articles automatically.`);
  }

  // Run after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
