// AUTOMATED ARTICLE FEED SYSTEM
// Auto-updates homepage with latest articles + relevant images
// No manual updates needed!

const ARTICLES = [
  {
    id: 'us-strategy',
    title: 'US Military Strategy in Middle East War',
    description: 'Comprehensive analysis of American military operations, carrier deployments, and strategic objectives in the Middle East conflict.',
    tag: '🇺🇸 US STRATEGY',
    tagBg: '#2563eb',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
    link: 'updatesworld/us-strategy.html',
    category: 'Strategic Analysis',
    published: new Date('2026-03-06T10:00:00'),
    keywords: ['US', 'military', 'strategy', 'operation', 'epic fury']
  },
  {
    id: 'iran-strategy',
    title: 'Iran\'s Military Strategy: Asymmetric Warfare & Proxy Forces',
    description: 'Deep analysis of Iran\'s defensive strategy, Revolutionary Guard tactics, and how asymmetric warfare counters US military superiority.',
    tag: '🇮🇷 IRAN STRATEGY',
    tagBg: '#dc2626',
    image: 'https://images.unsplash.com/photo-1578926314433-0e341b2edbf6?w=600&h=400&fit=crop',
    link: 'updatesworld/iran-strategy.html',
    category: 'Strategic Analysis',
    published: new Date('2026-03-06T09:30:00'),
    keywords: ['Iran', 'strategy', 'asymmetric', 'proxy', 'defense']
  },
  {
    id: 'israel-strategy',
    title: 'Israel\'s Defense Strategy: Operation Roaring Lion & Iron Dome',
    description: 'Detailed breakdown of Israeli military operations, advanced defense systems, and strategic objectives against Iranian nuclear threat.',
    tag: '🇮🇱 ISRAEL STRATEGY',
    tagBg: '#f97316',
    image: 'https://images.unsplash.com/photo-1551632786-de41ec18b67e?w=600&h=400&fit=crop',
    link: 'updatesworld/israel-strategy.html',
    category: 'Strategic Analysis',
    published: new Date('2026-03-06T09:00:00'),
    keywords: ['Israel', 'strategy', 'defense', 'iron dome', 'roaring lion']
  },
  {
    id: 'middle-east-crisis',
    title: 'Middle East Crisis: What\'s Happening & Why It Matters',
    description: 'Complete analysis of Middle East crisis, Iran-US tensions, and global impact. Live updates and expert analysis.',
    tag: '🌍 GEOPOLITICS',
    tagBg: '#d32f2f',
    image: 'https://images.unsplash.com/photo-1582716743212-82f5a7737220?w=600&h=400&fit=crop',
    link: 'updatesworld/middle-east-crisis.html',
    category: 'Geopolitical',
    published: new Date('2026-03-05T15:00:00'),
    keywords: ['middle east', 'crisis', 'geopolitics', 'analysis']
  },
  {
    id: 'us-assets-targeted',
    title: 'US Assets Targeted in Middle East - Military Impact & Response',
    description: 'Analysis of attacks on US military assets and embassy compounds in Middle East. Live coverage of American response and security measures.',
    tag: '🎯 MILITARY ALERT',
    tagBg: '#c41e3a',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
    link: 'updatesworld/us-assets-targeted.html',
    category: 'Military',
    published: new Date('2026-03-05T12:00:00'),
    keywords: ['US', 'assets', 'military', 'attack', 'response']
  },
  {
    id: 'iran-naval-ship',
    title: 'US Submarine Sinks Iranian Warship Near Sri Lanka — 80 Dead',
    description: 'USS submarine torpedoes Iranian frigate IRIS Dena in Indian Ocean near Sri Lanka. 80 Iranian sailors killed.',
    tag: '🚢 NAVAL WAR',
    tagBg: '#0284c7',
    image: 'https://images.unsplash.com/photo-1533612528813-be11f34fc5f0?w=600&h=400&fit=crop',
    link: 'updatesworld/iran-naval-ship.html',
    category: 'Naval War',
    published: new Date('2026-03-06T08:00:00'),
    keywords: ['naval', 'submarine', 'warship', 'iran', 'sri lanka']
  }
];

// Get latest N articles
function getLatestArticles(count = 3) {
  return ARTICLES
    .sort((a, b) => b.published - a.published)
    .slice(0, count);
}

// Generate HTML card for article
function generateCard(article) {
  return `
    <div class="news-card">
      <div class="news-card-image" style="padding:0;overflow:hidden;">
        <img src="${article.image}" alt="${article.title}" 
             style="width:100%;height:100%;object-fit:cover;" 
             onerror="this.parentElement.style.background='linear-gradient(135deg,${article.tagBg}33,${article.tagBg})';this.style.display='none'">
      </div>
      <div class="news-card-content">
        <span class="news-card-tag" style="background:${article.tagBg};">${article.tag}</span>
        <h3>${article.title}</h3>
        <p>${article.description}</p>
        <div class="news-card-meta">
          <span>${article.category}</span>
          <a href="${article.link}" class="read-more">Read →</a>
        </div>
      </div>
    </div>
  `;
}

// Auto-populate homepage cards
function populateHomePageCards() {
  const container = document.getElementById('newsCarousel');
  if (!container) return;

  // Get latest 3 articles
  const latestArticles = getLatestArticles(3);
  
  // Remove old cards (keep other cards like travel, embassy)
  const oldCards = container.querySelectorAll('.news-card');
  oldCards.forEach((card, index) => {
    if (index < 3) {
      card.remove(); // Remove first 3 old cards
    }
  });

  // Insert new cards at beginning
  let html = '';
  latestArticles.forEach(article => {
    html += generateCard(article);
  });

  container.insertAdjacentHTML('afterbegin', html);
}

// Auto-update when page loads
document.addEventListener('DOMContentLoaded', () => {
  populateHomePageCards();
  console.log('✅ Article feed auto-updated!');
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ARTICLES, getLatestArticles, generateCard, populateHomePageCards };
}
