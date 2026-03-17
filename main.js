// ===== SHARED UTILITIES =====

function showToast(msg, color) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  if (color) t.style.background = color;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

function copyText(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = el.value !== undefined ? el.value : el.textContent;
  navigator.clipboard.writeText(text.trim()).then(() => showToast('✅ Copied to clipboard!'));
}

// ===== VIDEO ID EXTRACTION =====
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

// ===== STATUS DISPLAY =====
function showStatus(id) {
  ["s-fetch","s-analyze","s-error"].forEach(s => document.getElementById(s).classList.remove("show"));
  if (id) document.getElementById(id).classList.add("show");
}

// ===== FETCH TRANSCRIPT =====
async function fetchTranscriptFromAPI(vid) {
  // Try multiple public APIs
  const endpoints = [
    `https://api.youtubetranscript.com/?videoId=${vid}`,
    `https://tactiq-apps-prod.tactiq.io/transcript?videoUrl=https://www.youtube.com/watch?v=${vid}&lang=en`,
    `https://yt-transcript-api.kome.ai/api/transcript?video_id=${vid}`
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data?.transcript?.length) return data.transcript.map(t => t.text).join(" ");
      if (data?.captions?.length) return data.captions.map(c => c.text).join(" ");
    } catch(e) {}
  }
  return null;
}

// ===== START ANALYSIS =====
let currentAnalysis = "", currentTranscript = "", currentVideoId = "";

async function startAnalysis() {
  const url = document.getElementById("yt-url").value.trim();
  const vid = extractVideoId(url);
  if (!vid) { document.getElementById("error-msg").textContent = "❌ Please enter a valid YouTube URL"; showStatus("s-error"); return; }

  currentVideoId = vid;
  document.getElementById("analyse-btn").disabled = true;
  document.getElementById("result-wrap").classList.remove("show");

  showStatus("s-fetch");
  const transcriptText = await fetchTranscriptFromAPI(vid);
  if (transcriptText) currentTranscript = transcriptText;

  await analyzeWithServerProxy(vid, currentTranscript || null);
}

// ===== ANALYSIS VIA SERVER =====
async function analyzeWithServerProxy(vid, transcript) {
  showStatus("s-analyze");

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: vid, transcript })
    });
    const data = await res.json();
    currentAnalysis = data.choices?.[0]?.message?.content || "";

    if (!currentAnalysis) throw new Error("Empty analysis");
    showResult(vid);
  } catch(err) {
    document.getElementById("error-msg").textContent = "⚠️ Analysis failed. Try again later.";
    showStatus("s-error");
    document.getElementById("analyse-btn").disabled = false;
  }
}

// ===== DISPLAY RESULT =====
function showResult(vid) {
  showStatus(null);

  const img = document.getElementById("thumb-img");
  img.src = `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`;
  img.onerror = () => { img.src = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`; };

  document.getElementById("yt-link").href = `https://youtube.com/watch?v=${vid}`;

  const out = document.getElementById("analysis-output");
  out.innerHTML = "";
  currentAnalysis.split("\n").forEach(line => {
    const p = document.createElement("p");
    if (line.match(/^\*\*.*\*\*$/) || line.match(/^#{1,3} /) || line.match(/^\d+\.\s/)) { 
      p.className = "a-hd"; p.textContent = line.replace(/\*\*/g,"").replace(/^#+\s/,""); 
    }
    else if (line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* ")) { 
      p.className = "a-bl"; p.textContent = "▸ " + line.slice(2); 
    }
    else if (line.trim() === "") { p.innerHTML = "<br>"; }
    else { p.textContent = line.replace(/\*\*/g,""); }
    out.appendChild(p);
  });

  if (currentTranscript) { 
    document.getElementById("raw-transcript").textContent = currentTranscript; 
    document.getElementById("copy-tx-btn").style.display = "inline-flex"; 
  }

  document.getElementById("result-wrap").classList.add("show");
  document.getElementById("analyse-btn").disabled = false;
  document.getElementById("result-wrap").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ===== COPY BUTTONS =====
function copyAnalysis() { copyText("analysis-output"); }
function copyTranscript() { copyText("raw-transcript"); }

// ===== RESET TOOL =====
function resetTool() {
  document.getElementById("yt-url").value = "";
  document.getElementById("result-wrap").classList.remove("show");
  showStatus(null);
  currentAnalysis = ""; currentTranscript = ""; currentVideoId = "";
  document.getElementById("copy-tx-btn").style.display = "none";
  document.getElementById("analyse-btn").disabled = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== ENTER KEY TRIGGER =====
document.getElementById("yt-url").addEventListener("keydown", e => { if (e.key === "Enter") startAnalysis(); });