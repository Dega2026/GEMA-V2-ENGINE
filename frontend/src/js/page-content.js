async function fetchDynamicPageContent(slug, lang) {
  const response = await fetch(`/api/page-content/${slug}?lang=${lang}`);
  if (!response.ok) {
    throw new Error('Failed to fetch page content');
  }

  const payload = await response.json();
  if (!payload.success) {
    throw new Error(payload.message || 'Invalid page content response');
  }

  return payload.content || { title: '', cards: [] };
}

function updateSeoMeta(title, description) {
  const safeTitle = title || 'GEMA Global Medical';
  const safeDescription = description || 'GEMA Global Medical operations and company profile.';

  document.title = `${safeTitle} | GEMA Global Medical`;

  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) descriptionMeta.setAttribute('content', safeDescription);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', `${safeTitle} | GEMA Global Medical`);

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) ogDescription.setAttribute('content', safeDescription);
}

function renderDynamicCards(content) {
  const titleNode = document.getElementById('page-main-title');
  const cardsContainer = document.getElementById('dynamic-cards');

  if (titleNode) {
    titleNode.textContent = content.title || 'GEMA Content';
  }

  if (!cardsContainer) return;

  const cards = Array.isArray(content.cards) ? content.cards.slice(0, 3) : [];

  if (!cards.length) {
    cardsContainer.innerHTML = `
      <div class="gema-card">
        <div class="card-content">
          <h3>Content Sync Pending</h3>
          <p>Page content will appear here once published from the admin dashboard.</p>
        </div>
      </div>
    `;
    return;
  }

  cardsContainer.innerHTML = cards
    .map(
      (card) => `
      <article class="gema-card gema-card-shell">
        <div class="card-image page-card-image" data-bg-image="${card.image || '/assets/images/trading/shanghai-hub.jpg'}"></div>
        <div class="card-content">
          <h3>${card.title || 'Untitled Card'}</h3>
          <p>${card.text || ''}</p>
        </div>
      </article>
    `,
    )
    .join('');

  cardsContainer.querySelectorAll('.page-card-image').forEach((imageNode) => {
    const imageUrl = imageNode.getAttribute('data-bg-image') || '';
    if (imageUrl) imageNode.style.backgroundImage = `url('${imageUrl}')`;
  });

  const description = cards[0]?.text || '';
  updateSeoMeta(content.title, description);
}

async function loadDynamicPageContent() {
  const slug = document.body.dataset.pageSlug;
  if (!slug) return;

  const lang = localStorage.getItem('selectedLang') || 'en';
  try {
    const content = await fetchDynamicPageContent(slug, lang);
    renderDynamicCards(content);
  } catch (error) {
    const cardsContainer = document.getElementById('dynamic-cards');
    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="gema-card">
          <div class="card-content">
            <h3>Content Unavailable</h3>
            <p>Unable to load content right now. Please refresh shortly.</p>
          </div>
        </div>
      `;
    }
  }
}

document.addEventListener('languageChanged', async () => {
  await loadDynamicPageContent();
});

document.addEventListener('DOMContentLoaded', async () => {
  await loadDynamicPageContent();
});
