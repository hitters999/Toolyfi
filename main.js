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

function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
}

// Search & Category Filter (homepage)
function initFilter() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      document.querySelectorAll('.tool-card').forEach(c => {
        c.style.display = c.innerText.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }
}

function filterCat(cat, btn) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tool-card').forEach(c => {
    c.style.display = (cat === 'all' || c.dataset.cat === cat) ? '' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', initFilter);

// ===== NAV MOBILE MENU =====
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.querySelector('.nav-mobile-btn');
  const links = document.querySelector('.nav-links');
  if (btn && links) {
    btn.addEventListener('click', () => {
      links.classList.toggle('open');
    });
  }
});