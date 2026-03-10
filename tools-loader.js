/**
 * ============================================================
 *  Toolyfi — Auto Tools Loader v2
 *  Kisi bhi file mein kuch add karne ki zarurat nahi!
 *  Sab tools yahan hard-code hain — bas file upload karo
 *  aur card automatically show hoga.
 * ============================================================
 */

(function () {

  // ── TOOLS DATA — Naya tool add karna ho toh yahan add karo ──
  const TOOLS = [
    // IMAGE TOOLS
    { name: "Background Remover",      desc: "Remove backgrounds with AI. Download as PNG.",          icon: "🖼️", category: "image",      href: "https://bg.toolyfi.com" },
    { name: "Image Resizer",           desc: "Resize images to any size instantly.",                   icon: "📐", category: "image",      href: "image-resizer.html" },
    { name: "Image Compressor",        desc: "Reduce image size without quality loss.",                icon: "🗜️", category: "image",      href: "image-compressor.html" },

    // CALCULATORS
    { name: "Age Calculator",          desc: "Calculate exact age in days, months and years.",         icon: "🎂", category: "calculator", href: "age-calculator.html" },
    { name: "Scientific Calculator",   desc: "Advanced mathematics calculator.",                       icon: "🧮", category: "calculator", href: "scientific-calculator.html" },
    { name: "BMI Calculator",          desc: "Calculate Body Mass Index with health tips.",            icon: "⚖️", category: "calculator", href: "bmi-calculator.html" },
    { name: "Loan Calculator",         desc: "Calculate loan EMI, interest and repayments.",           icon: "🏦", category: "calculator", href: "loan-calculator.html" },
    { name: "Percentage Calculator",   desc: "Calculate percentages quickly and easily.",              icon: "💯", category: "calculator", href: "percentage-calculator.html" },

    // CONVERTERS
    { name: "Currency Converter",      desc: "Real-time currency conversion.",                         icon: "💱", category: "converter",  href: "currency-converter.html" },
    { name: "Temperature Converter",   desc: "Convert between Celsius, Fahrenheit, Kelvin.",           icon: "🌡️", category: "converter",  href: "temperature-converter.html" },
    { name: "Unit Converter",          desc: "Convert length, weight, volume and more.",               icon: "📏", category: "converter",  href: "unit-converter.html" },
    { name: "Number to Words",         desc: "Convert numbers to English words instantly.",            icon: "🔢", category: "converter",  href: "number-to-words.html" },
    { name: "CSV to JSON",             desc: "Convert CSV data to JSON format instantly.",             icon: "🔄", category: "converter",  href: "csv-to-json.html" },
    { name: "Base64 Encoder",          desc: "Encode and decode Base64 strings easily.",              icon: "🔐", category: "converter",  href: "base64-encoder.html" },

    // TEXT TOOLS
    { name: "Text Trimmer",            desc: "Remove extra spaces and format text.",                   icon: "✂️", category: "text",       href: "text-trimmer.html" },
    { name: "JSON Formatter",          desc: "Format and validate JSON instantly.",                    icon: "📊", category: "text",       href: "json-formatter.html" },
    { name: "Word Counter",            desc: "Count words, characters and sentences.",                 icon: "📝", category: "text",       href: "word-counter.html" },
    { name: "Case Converter",          desc: "Convert text to UPPER, lower, Title Case.",             icon: "🔡", category: "text",       href: "case-converter.html" },
    { name: "Markdown to HTML",        desc: "Convert Markdown syntax to clean HTML instantly.",       icon: "📄", category: "text",       href: "markdown-to-html-seo.html" },

    // GENERATORS
    { name: "QR Code Generator",       desc: "Create QR codes instantly. Download as PNG or SVG.",    icon: "📱", category: "generator",  href: "qr-code-generator.html" },
    { name: "Password Generator",      desc: "Generate strong secure passwords instantly.",            icon: "🔑", category: "generator",  href: "password-generator.html" },
    { name: "Random Number Generator", desc: "Generate random numbers in any range.",                 icon: "🎲", category: "generator",  href: "random-number-generator.html" },
    { name: "Prompt Generator",        desc: "500+ AI prompts for ChatGPT, Claude & Gemini.",         icon: "✨", category: "generator",  href: "prompt-generator.html" },

    // AI & VIRAL TOOLS
    { name: "AI Text Detector",    desc: "Detect if text is AI or human written. Free & instant.",  icon: "🤖", category: "ai",        href: "ai-text-detector.html" },
    { name: "AI Image Generator",  desc: "Turn text into stunning AI images free. 9 styles.",        icon: "🎨", category: "ai",        href: "ai-image-generator.html" },
    { name: "Invoice Generator",   desc: "Create professional PDF invoices free. No signup.",        icon: "📊", category: "generator", href: "invoice-generator.html" },
    { name: "Resume / CV Builder", desc: "Build ATS-friendly resume, download as PDF. Free.",        icon: "📄", category: "generator", href: "resume-builder.html" },
    { name: "Link Shortener",      desc: "Shorten any URL instantly. Custom alias, no signup.",      icon: "🔗", category: "general",   href: "link-shortener.html" },

    // Naya tool add karna ho — bas yahan ek line add karo:
    // { name: "Tool Name", desc: "Short description.", icon: "🔧", category: "general", href: "tool-file.html" },
  ];

  // ── BUILD tool card HTML ─────────────────────────────────
  function buildCard(tool) {
    return `
      <div class="tool-card" data-category="${tool.category}">
        <div class="tool-icon">${tool.icon}</div>
        <h3 class="tool-name">${tool.name}</h3>
        <p class="tool-desc">${tool.desc}</p>
        <a href="${tool.href}" class="tool-link">Use Tool →</a>
      </div>`;
  }

  // ── INJECT CARDS ─────────────────────────────────────────
  function injectCards() {
    const container = document.getElementById("auto-tools-grid");
    if (!container) return;
    container.innerHTML = TOOLS.map(buildCard).join("");
  }

  // ── CATEGORY FILTER ──────────────────────────────────────
  function setupFilter() {
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const cat = this.getAttribute('data-cat') || 'all';
        document.querySelectorAll('.tool-card[data-category]').forEach(card => {
          card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
        });
      });
    });
  }

  // ── MAIN ─────────────────────────────────────────────────
  function init() {
    injectCards();
    setupFilter();
    console.log("✅ Toolyfi: " + TOOLS.length + " tools loaded.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
