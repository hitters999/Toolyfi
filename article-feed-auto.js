// AUTOMATED ARTICLE FEED SYSTEM
// Auto-updates homepage with latest articles + relevant images
// No manual updates needed!

const ARTICLES = [
  {
    id: 'ai-trends-2026',
    title: 'Top AI Trends to Watch in 2026',
    description: 'From autonomous agents to multimodal models, discover the key AI trends that are shaping the future of technology this year.',
    tag: '🤖 AI TRENDS',
    tagBg: '#7c3aed',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
    link: 'updatesworld/economic-trends-ai.html',
    category: 'Technology',
    published: new Date('2026-04-15T10:00:00'),
    keywords: ['AI', 'trends', '2026', 'technology', 'future']
  },
  {
    id: 'remote-work-tools',
    title: 'Best Free Tools for Remote Teams in 2026',
    description: 'Boost your team\'s productivity with these essential free tools for communication, project management, and collaboration.',
    tag: '💻 REMOTE WORK',
    tagBg: '#059669',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&h=400&fit=crop',
    link: 'updatesworld/best-free-ai-tools-2026.html',
    category: 'Productivity',
    published: new Date('2026-04-10T09:30:00'),
    keywords: ['remote work', 'tools', 'productivity', 'collaboration']
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
