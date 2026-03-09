async function fetchGemaBroadcast() {
	const homepageContainer = document.getElementById('homepage-news-list');
	const newsPageContainer = document.getElementById('news-feed-list');

	if (!homepageContainer && !newsPageContainer) {
		return;
	}

	try {
		const response = await fetch('/api/news');
		if (!response.ok) {
			throw new Error('News API response failed');
		}

		const newsItems = await response.json();
		renderNewsCollection(homepageContainer, newsItems, 3);
		renderNewsCollection(newsPageContainer, newsItems, 24);
	} catch (error) {
		renderNewsError(homepageContainer);
		renderNewsError(newsPageContainer);
	}
}

const SUPPORTED_LANGS = ['ar', 'en', 'de', 'zh', 'tr'];
const ABOUT_LOCAL_DEFAULTS = {
	en: {
		title: 'About GEMA',
		abt_subtitle: 'THE GEMA MULTIVERSE',
		abt_vision_h2: 'Our Vision',
		abt_vision_p: 'To become the primary medical infrastructure partner in the region.',
		cards: [
			{
				title: 'Riyadh & Shanghai Hubs',
				text: 'Regional operations in Riyadh and sourcing in Shanghai powering fast delivery.',
				image: '/assets/images/news/riyadh-hq.jpg'
			},
			{
				title: 'Digital Intelligence',
				text: 'AI-first execution and digital systems built with enterprise-grade governance.',
				image: '/assets/images/news/future-news.jpg'
			},
			{
				title: 'Industrial Excellence',
				text: 'German-grade manufacturing discipline combined with local operational scale.',
				image: '/assets/images/news/factory-news.jpg'
			}
		]
	},
	ar: {
		title: 'عن جيما',
		abt_subtitle: 'عالم جيما المتعدد',
		abt_vision_h2: 'رؤيتنا',
		abt_vision_p: 'أن نصبح الشريك الأول للبنية التحتية الطبية في المنطقة.',
		cards: [
			{
				title: 'مراكز الرياض وشنغهاي',
				text: 'عمليات إقليمية في الرياض وتوريد من شنغهاي يدعمان سرعة التسليم.',
				image: '/assets/images/news/riyadh-hq.jpg'
			},
			{
				title: 'الذكاء الرقمي',
				text: 'تنفيذ يعتمد على الذكاء الاصطناعي وأنظمة رقمية مبنية بحوكمة مؤسسية.',
				image: '/assets/images/news/future-news.jpg'
			},
			{
				title: 'التميز الصناعي',
				text: 'انضباط تصنيع بمعايير ألمانية مع نطاق تشغيلي محلي.',
				image: '/assets/images/news/factory-news.jpg'
			}
		]
	},
	de: {
		title: 'Uber GEMA',
		abt_subtitle: 'DAS GEMA MULTIVERSUM',
		abt_vision_h2: 'Unsere Vision',
		abt_vision_p: 'Der fuhrende Partner fur medizinische Infrastruktur in der Region zu sein.',
		cards: [
			{
				title: 'Hubs in Riad und Shanghai',
				text: 'Regionale Ablaufe in Riad und Beschaffung in Shanghai ermoglichen schnelle Lieferung.',
				image: '/assets/images/news/riyadh-hq.jpg'
			},
			{
				title: 'Digitale Intelligenz',
				text: 'AI-First-Umsetzung und digitale Systeme mit Governance auf Enterprise-Niveau.',
				image: '/assets/images/news/future-news.jpg'
			},
			{
				title: 'Industrielle Exzellenz',
				text: 'Deutsche Fertigungsdisziplin kombiniert mit lokaler operativer Skalierung.',
				image: '/assets/images/news/factory-news.jpg'
			}
		]
	},
	zh: {
		title: '关于 GEMA',
		abt_subtitle: 'GEMA 多元宇宙',
		abt_vision_h2: '我们的愿景',
		abt_vision_p: '成为区域内首要的医疗基础设施合作伙伴。',
		cards: [
			{
				title: '利雅得与上海枢纽',
				text: '利雅得区域运营与上海采购协同，保障快速交付。',
				image: '/assets/images/news/riyadh-hq.jpg'
			},
			{
				title: '数字智能',
				text: '以 AI 为先的执行体系与企业级治理的数字系统。',
				image: '/assets/images/news/future-news.jpg'
			},
			{
				title: '工业卓越',
				text: '德系制造纪律结合本地化运营规模。',
				image: '/assets/images/news/factory-news.jpg'
			}
		]
	},
	tr: {
		title: 'GEMA Hakkinda',
		abt_subtitle: 'GEMA COKLU EVRENI',
		abt_vision_h2: 'Vizyonumuz',
		abt_vision_p: 'Bolgede birincil medikal altyapi ortagi olmak.',
		cards: [
			{
				title: 'Riyad ve Sanghay Merkezleri',
				text: 'Riyad\'daki bolgesel operasyonlar ve Sanghay\'daki tedarik hizli teslimati destekler.',
				image: '/assets/images/news/riyadh-hq.jpg'
			},
			{
				title: 'Dijital Zeka',
				text: 'Yapay zeka odakli yurutme ve kurumsal duzeyde yonetisimle kurulan dijital sistemler.',
				image: '/assets/images/news/future-news.jpg'
			},
			{
				title: 'Endustriyel Mukemmellik',
				text: 'Alman standartlarinda uretim disiplini, yerel operasyonel olcekle birlesir.',
				image: '/assets/images/news/factory-news.jpg'
			}
		]
	}
};

function getLocalPageFallback(slug, lang) {
	if (slug === 'about') {
		return ABOUT_LOCAL_DEFAULTS[lang] || ABOUT_LOCAL_DEFAULTS.en;
	}
	return {};
}

function mergeLocalizedContent(fallbackValue, dbValue) {
	const fallback = fallbackValue && typeof fallbackValue === 'object' ? fallbackValue : {};
	const db = dbValue && typeof dbValue === 'object' ? dbValue : {};

	const merged = { ...fallback, ...db };

	const fallbackCards = Array.isArray(fallback.cards) ? fallback.cards : [];
	const dbCards = Array.isArray(db.cards) ? db.cards : [];
	if (fallbackCards.length || dbCards.length) {
		const max = Math.max(fallbackCards.length, dbCards.length);
		merged.cards = Array.from({ length: max }, (_, index) => ({
			...(fallbackCards[index] || {}),
			...(dbCards[index] || {})
		}));
	}

	return merged;
}

function getCurrentPageSlug() {
	const explicitSlug = document.body?.dataset?.pageSlug;
	if (explicitSlug && explicitSlug.trim()) {
		return explicitSlug.trim().toLowerCase();
	}

	const pathName = window.location.pathname.replace(/\/+$/, '') || '/';
	if (pathName === '/') return 'home';

	const clean = pathName.replace(/^\//, '');
	if (clean === 'index.html') return 'home';
	if (clean.includes('/')) return clean.split('/')[0] || 'home';
	return clean;
}

function resolveByPath(source, path) {
	if (!source || !path || typeof path !== 'string') {
		return undefined;
	}

	const directPath = path.trim();
	if (!directPath) {
		return undefined;
	}

	if (Object.prototype.hasOwnProperty.call(source, directPath)) {
		return source[directPath];
	}

	const normalizedPath = directPath
		.replace(/\[(\d+)\]/g, '.$1')
		.split('.')
		.filter(Boolean);

	let current = source;
	for (const segment of normalizedPath) {
		if (current == null) {
			return undefined;
		}

		if (Array.isArray(current)) {
			const index = Number(segment);
			if (!Number.isInteger(index) || index < 0 || index >= current.length) {
				return undefined;
			}
			current = current[index];
			continue;
		}

		if (typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, segment)) {
			current = current[segment];
			continue;
		}

		return undefined;
	}

	return current;
}

function applyLanguageBodyClasses(lang) {
	const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : 'en';
	document.body.classList.remove('lang-ar', 'lang-en', 'lang-de', 'lang-zh', 'lang-tr');
	document.body.classList.add(`lang-${safeLang}`);

	if (safeLang === 'ar') {
		document.dir = 'rtl';
		document.documentElement.dir = 'rtl';
	} else if (safeLang === 'zh') {
		document.dir = 'ltr';
		document.documentElement.dir = 'ltr';
	} else if (safeLang === 'de') {
		document.dir = 'ltr';
		document.documentElement.dir = 'ltr';
	} else if (safeLang === 'tr') {
		document.dir = 'ltr';
		document.documentElement.dir = 'ltr';
	} else {
		document.dir = 'ltr';
		document.documentElement.dir = 'ltr';
	}

	document.documentElement.lang = safeLang;
}

function updateMetaTag(selector, value) {
	if (typeof value !== 'string' || !value.trim()) return;
	const node = document.querySelector(selector);
	if (!node) return;
	node.setAttribute('content', value.trim());
}

function getSeoValue(content, fallbackContent, keyPath, fallback = '') {
	const direct = resolveByPath(content, keyPath);
	if (typeof direct === 'string' && direct.trim()) return direct.trim();
	const backup = resolveByPath(fallbackContent, keyPath);
	if (typeof backup === 'string' && backup.trim()) return backup.trim();
	return fallback;
}

function applyDynamicSeoMeta(slug, lang, content, fallbackContent = {}) {
	const currentTitle = document.title || 'GEMA';
	const seoTitle = getSeoValue(content, fallbackContent, 'seo.title', currentTitle);
	const seoDescription = getSeoValue(
		content,
		fallbackContent,
		'seo.description',
		'GEMA Global Medical - Multi-language industrial and medical ecosystem.'
	);

	document.title = seoTitle;
	updateMetaTag('meta[name="description"]', seoDescription);
	updateMetaTag('meta[property="og:title"]', seoTitle);
	updateMetaTag('meta[property="og:description"]', seoDescription);
	updateMetaTag('meta[name="twitter:title"]', seoTitle);
	updateMetaTag('meta[name="twitter:description"]', seoDescription);

	const canonicalNode = document.querySelector('link[rel="canonical"]');
	if (canonicalNode) {
		const basePath = window.location.pathname || '/';
		canonicalNode.setAttribute('href', `${window.location.origin}${basePath}?lang=${lang}`);
	}

	const hreflangNodes = document.querySelectorAll('link[rel="alternate"][hreflang]');
	if (hreflangNodes.length) {
		hreflangNodes.forEach((node) => {
			const hrefLang = (node.getAttribute('hreflang') || '').toLowerCase();
			if (SUPPORTED_LANGS.includes(hrefLang)) {
				node.setAttribute('href', `${window.location.origin}/${slug === 'home' ? '' : slug}?lang=${hrefLang}`);
			}
		});
	}
}

function initGlobalLazyLoading() {
	const imageNodes = Array.from(document.querySelectorAll('img:not([loading])'));
	imageNodes.forEach((img) => {
		img.setAttribute('loading', 'lazy');
		img.setAttribute('decoding', 'async');
	});

	const bgNodes = Array.from(document.querySelectorAll('[data-bg-image]'));
	if (!bgNodes.length) return;

	if (!('IntersectionObserver' in window)) {
		bgNodes.forEach((node) => {
			const bg = node.getAttribute('data-bg-image') || '';
			if (bg) node.style.backgroundImage = `url('${bg}')`;
		});
		return;
	}

	const observer = new IntersectionObserver((entries, obs) => {
		entries.forEach((entry) => {
			if (!entry.isIntersecting) return;
			const node = entry.target;
			const bg = node.getAttribute('data-bg-image') || '';
			if (bg) node.style.backgroundImage = `url('${bg}')`;
			obs.unobserve(node);
		});
	}, { rootMargin: '120px 0px' });

	bgNodes.forEach((node) => observer.observe(node));
}

function resolveContentValue(content, dataKey, fallbackContent = {}) {
	const direct = resolveByPath(content, dataKey);
	if (typeof direct === 'string') return direct;
	if (typeof direct === 'number') return String(direct);

	if (!dataKey.includes('.')) {
		const fromStrings = resolveByPath(content, `strings.${dataKey}`);
		if (typeof fromStrings === 'string') return fromStrings;

		const fallbackFromStrings = resolveByPath(fallbackContent, `strings.${dataKey}`);
		if (typeof fallbackFromStrings === 'string') return fallbackFromStrings;
	}

	const fallbackDirect = resolveByPath(fallbackContent, dataKey);
	if (typeof fallbackDirect === 'string') return fallbackDirect;
	if (typeof fallbackDirect === 'number') return String(fallbackDirect);

	return '';
}

function injectPageContentByDataKey(content, fallbackContent = {}) {
	// Migration bridge: convert legacy translation markers into the new i18n contract.
	document.querySelectorAll('[data-i18n]').forEach((node) => {
		node.classList.add('i18n');
		if (!node.getAttribute('data-key')) {
			node.setAttribute('data-key', node.getAttribute('data-i18n'));
		}
	});

	const textNodes = document.querySelectorAll('.i18n[data-key], [data-key]');
	textNodes.forEach((node) => {
		const key = node.getAttribute('data-key');
		const value = resolveContentValue(content, key, fallbackContent);
		const safeValue = (typeof value === 'string' && value.trim().length > 0)
			? value
			: (node.innerHTML || '');
		// Keep HTML-capable strings like <span> highlights from translations/content payloads.
		node.innerHTML = safeValue;
	});

	const imageNodes = document.querySelectorAll('[data-key-image]');
	imageNodes.forEach((node) => {
		const imagePath = resolveByPath(content, node.getAttribute('data-key-image'));
		const fallbackImagePath = resolveByPath(fallbackContent, node.getAttribute('data-key-image'));
		const safePath = typeof imagePath === 'string' && imagePath.trim()
			? imagePath.trim()
			: (typeof fallbackImagePath === 'string' && fallbackImagePath.trim()
				? fallbackImagePath.trim()
				: '/assets/images/trading/shanghai-hub.jpg');
		node.style.backgroundImage = `url('${safePath}')`;
	});
}

function injectCardImagesByIndex(content, fallbackContent = {}) {
	const imageNodes = document.querySelectorAll('[data-key-image^="cards."]');
	if (!imageNodes.length) return;

	const cards = Array.isArray(content?.cards) ? content.cards : [];
	const fallbackCards = Array.isArray(fallbackContent?.cards) ? fallbackContent.cards : [];

	imageNodes.forEach((node, index) => {
		const byIndex = cards[index]?.image;
		const fallbackByIndex = fallbackCards[index]?.image;
		const byPath = resolveByPath(content, node.getAttribute('data-key-image'));
		const fallbackByPath = resolveByPath(fallbackContent, node.getAttribute('data-key-image'));
		const safePath = [byIndex, byPath, fallbackByIndex, fallbackByPath].find((value) =>
			typeof value === 'string' && value.trim().length > 0
		) || '/assets/images/trading/shanghai-hub.jpg';

		node.style.backgroundImage = `url('${safePath}')`;
	});
}

function parseBooleanFlag(value, fallback = true) {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') return value !== 0;
	if (typeof value !== 'string') return fallback;
	const normalized = value.trim().toLowerCase();
	if (['false', '0', 'no', 'off', 'hidden'].includes(normalized)) return false;
	if (['true', '1', 'yes', 'on', 'visible'].includes(normalized)) return true;
	return fallback;
}

function syncHomeSectionVisibility(content, fallbackContent = {}) {
	if (getCurrentPageSlug() !== 'home') return;

	const newsSection = document.getElementById('home-news-section');
	const exploreSection = document.getElementById('home-explore-section');

	const newsEnabled = parseBooleanFlag(
		resolveByPath(content, 'sections.news.enabled')
			?? resolveByPath(content, 'strings.home_news_enabled')
			?? resolveByPath(fallbackContent, 'sections.news.enabled')
			?? resolveByPath(fallbackContent, 'strings.home_news_enabled'),
		true
	);

	const exploreEnabled = parseBooleanFlag(
		resolveByPath(content, 'sections.explore.enabled')
			?? resolveByPath(content, 'strings.home_explore_enabled')
			?? resolveByPath(fallbackContent, 'sections.explore.enabled')
			?? resolveByPath(fallbackContent, 'strings.home_explore_enabled'),
		true
	);

	if (newsSection) {
		newsSection.style.display = newsEnabled ? '' : 'none';
	}

	if (exploreSection) {
		exploreSection.style.display = exploreEnabled ? '' : 'none';
	}
}

async function globalLoader() {
	const slug = getCurrentPageSlug();
	if (!slug) {
		return;
	}

	const selectedLang = localStorage.getItem('selectedLang') || 'en';
	const lang = SUPPORTED_LANGS.includes(selectedLang) ? selectedLang : 'en';
	applyLanguageBodyClasses(lang);

	try {
		const response = await fetch(`/api/pages/${slug}?includeAll=1`);
		if (!response.ok) {
			throw new Error('Page content API response failed');
		}

		const payload = await response.json();
		if (!payload.success || !payload.content) {
			throw new Error(payload.message || 'Invalid page content payload');
		}

		const localLangFallback = getLocalPageFallback(slug, lang);
		const localEnglishFallback = getLocalPageFallback(slug, 'en');

		const localizedContent = mergeLocalizedContent(localLangFallback, payload.content?.[lang] || {});
		const englishFallback = mergeLocalizedContent(localEnglishFallback, payload.content?.en || {});
		applyDynamicSeoMeta(slug, lang, localizedContent, englishFallback);
		injectPageContentByDataKey(localizedContent, englishFallback);
		injectCardImagesByIndex(localizedContent, englishFallback);
		syncHomeSectionVisibility(localizedContent, englishFallback);
	} catch (error) {
		console.error('Page content load failed:', error);
		const localLangFallback = getLocalPageFallback(slug, lang);
		const localEnglishFallback = getLocalPageFallback(slug, 'en');
		if (Object.keys(localLangFallback).length || Object.keys(localEnglishFallback).length) {
			applyDynamicSeoMeta(slug, lang, localLangFallback, localEnglishFallback);
			injectPageContentByDataKey(localLangFallback, localEnglishFallback);
			injectCardImagesByIndex(localLangFallback, localEnglishFallback);
		}
	}
}

function renderNewsCollection(container, newsItems, limit) {
	if (!container) {
		return;
	}

	const list = Array.isArray(newsItems) ? newsItems.slice(0, limit) : [];

	if (!list.length) {
		container.innerHTML = `
			<div class="gema-card">
				<div class="card-content">
					<h3>No Broadcast Stories Yet</h3>
					<p>Fresh newsroom posts will appear here once published.</p>
				</div>
			</div>
		`;
		return;
	}

	container.innerHTML = list.map((item) => {
		const published = new Date(item.createdAt).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});

		return `
			<article class="gema-card news-card-shell">
				<div class="card-image news-card-image" data-bg-image="${item.image}"></div>
				<div class="card-content">
					<span class="category-tag news-card-tag">Broadcast | ${published}</span>
					<h3>${item.title}</h3>
					<p class="news-card-desc">Strategic insight from GEMA intelligence desk.</p>
					<a href="${item.postLink}" target="_blank" rel="noopener" class="btn-text news-card-link">Read Full Story</a>
				</div>
			</article>
		`;
	}).join('');

	container.querySelectorAll('.news-card-image[data-bg-image]').forEach((node) => {
		const bg = node.getAttribute('data-bg-image') || '';
		node.style.backgroundImage = `url('${bg}')`;
	});
}

function renderNewsError(container) {
	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="gema-card">
			<div class="card-content">
				<h3>News Feed Offline</h3>
				<p>Unable to sync GEMA Broadcast right now. Please try again shortly.</p>
			</div>
		</div>
	`;
}

function isProductDetailsRoute() {
	return /^\/product\/[^/]+/i.test(window.location.pathname || '');
}

function normalizeDatasheetUrl(rawUrl) {
	if (typeof rawUrl !== 'string') return '';
	const url = rawUrl.trim();
	if (!url) return '';

	const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
	if (driveMatch && driveMatch[1]) {
		return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
	}

	return url;
}

function setHTMLById(id, value, fallback = '') {
	const node = document.getElementById(id);
	if (!node) return;
	const safeValue = typeof value === 'string' && value.trim().length > 0 ? value : fallback;
	node.innerHTML = safeValue;
}

function formatMoney(value, currency, fallback = 'Price on request') {
	const amount = Number(value);
	if (!Number.isFinite(amount) || amount <= 0) return fallback;
	const safeCurrency = String(currency || 'USD').toUpperCase();
	return `${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${safeCurrency}`;
}

async function loadProductDetails() {
	if (!isProductDetailsRoute()) return;

	const productId = (window.location.pathname.split('/').pop() || '').trim();
	if (!productId) return;

	try {
		const response = await fetch(`/api/products/${productId}`);
		if (!response.ok) {
			throw new Error('Product API response failed');
		}

		const product = await response.json();
		const specs = product?.technicalSpecs || {};

		setHTMLById('product-category', product?.category || 'General');
		setHTMLById('product-name', product?.name || 'GEMA Product');
		setHTMLById('product-description', product?.description || 'Product details unavailable.');
		setHTMLById('product-price', formatMoney(product?.price, product?.currency));
		setHTMLById('spec-components', specs.components || 'GEMA Standard Design');
		setHTMLById('spec-sizes', specs.sizes || 'Standard clinical range');
		setHTMLById('spec-sterilization', specs.sterilization || 'EO Gas Sterilized');
		setHTMLById('spec-compliance', specs.compliance || 'ISO 13485, CE Certified');

		const imageNode = document.getElementById('product-image');
		if (imageNode) {
			const imagePath = typeof product?.imagePath === 'string' && product.imagePath.trim()
				? product.imagePath.trim()
				: (typeof product?.image === 'string' && product.image.trim()
					? product.image.trim()
					: '/assets/images/sectors/products.jpg');
			imageNode.style.backgroundImage = `url('${imagePath}')`;
		}

		const datasheetButton = document.getElementById('btn-download-datasheet');
		if (datasheetButton) {
			const datasheetUrl = normalizeDatasheetUrl(product?.datasheet_url || product?.datasheet || '');
			if (datasheetUrl) {
				datasheetButton.href = datasheetUrl;
				datasheetButton.classList.remove('is-disabled');
				datasheetButton.removeAttribute('aria-disabled');
				datasheetButton.removeAttribute('tabindex');
				datasheetButton.removeAttribute('title');
			} else {
				datasheetButton.href = '#';
				datasheetButton.classList.add('is-disabled');
				datasheetButton.setAttribute('aria-disabled', 'true');
				datasheetButton.setAttribute('tabindex', '-1');
				datasheetButton.setAttribute('title', 'Datasheet not available for this product yet.');
			}
		}

		document.title = `${product?.name || 'Product'} | GEMA`;
	} catch (error) {
		setHTMLById('product-name', 'Product Not Found');
		setHTMLById('product-description', 'Unable to load product matrix data at this time.');
		const datasheetButton = document.getElementById('btn-download-datasheet');
		if (datasheetButton) {
			datasheetButton.href = '#';
			datasheetButton.classList.add('is-disabled');
			datasheetButton.setAttribute('aria-disabled', 'true');
			datasheetButton.setAttribute('tabindex', '-1');
		}
	}
}

function enforceHomeSuppression() {
	if (getCurrentPageSlug() !== 'home') return;
	['home-news-section', 'home-explore-section'].forEach((id) => {
		const node = document.getElementById(id);
		if (node) node.style.display = 'none';
	});
}

function loadPublicConciergeWidget() {
	if (document.getElementById('gema-public-chat-widget-loader')) return;

	const pathName = String(window.location.pathname || '').toLowerCase();
	if (pathName.includes('/admin') || pathName.includes('/client-portal')) return;

	const script = document.createElement('script');
	script.id = 'gema-public-chat-widget-loader';
	script.src = '/js/public-chat-widget.js';
	script.defer = true;
	document.body.appendChild(script);
}

function resolveMachineryScopeForPage() {
	const slug = getCurrentPageSlug();
	if (slug === 'trading') return 'trading';
	if (slug === 'engineering') return 'engineering';
	return '';
}

function pickMachineryByScope(items, scope) {
	if (!Array.isArray(items) || !items.length) return null;
	const normalizedScope = String(scope || '').toLowerCase();

	return items.find((item) => String(item?.category || '').toLowerCase().includes(normalizedScope))
		|| items.find((item) => String(item?.slug || '').toLowerCase().includes(normalizedScope))
		|| items[0];
}

function normalizeMachineCategory(value) {
	return String(value || '').trim().toLowerCase();
}

function isScopeMatch(item, scope) {
	const normalizedScope = String(scope || '').toLowerCase();
	if (!normalizedScope) return true;

	const slug = String(item?.slug || '').toLowerCase();
	const name = String(item?.name || '').toLowerCase();
	const category = normalizeMachineCategory(item?.category);

	if (slug.includes(normalizedScope) || name.includes(normalizedScope)) return true;
	if (normalizedScope === 'trading' && category.includes('trading')) return true;
	if (normalizedScope === 'engineering' && category.includes('engineering')) return true;

	return false;
}

function isKindMatch(item, kind) {
	const normalizedKind = String(kind || '').toLowerCase();
	if (!normalizedKind || normalizedKind === 'default') return true;

	const category = normalizeMachineCategory(item?.category);
	const slug = String(item?.slug || '').toLowerCase();
	const name = String(item?.name || '').toLowerCase();

	if (normalizedKind === 'spare-parts') {
		return category.includes('spare')
			|| category.includes('maintenance')
			|| slug.includes('spare')
			|| slug.includes('maint')
			|| name.includes('spare')
			|| name.includes('maintenance');
	}

	if (normalizedKind === 'machinery') {
		const isSpare = category.includes('spare') || category.includes('maintenance') || slug.includes('spare') || slug.includes('maint');
		return !isSpare;
	}

	return true;
}

function pickMachineForCard(items, scope, kind, usedIds) {
	if (!Array.isArray(items) || !items.length) return null;

	const available = items.filter((item) => !usedIds.has(String(item?._id || item?.slug || item?.name || '')));
	const scoped = available.filter((item) => isScopeMatch(item, scope));
	const scopedPool = scoped.length ? scoped : available;
	const kindMatched = scopedPool.filter((item) => isKindMatch(item, kind));
	const selected = kindMatched[0] || scopedPool[0] || null;

	if (selected) {
		usedIds.add(String(selected?._id || selected?.slug || selected?.name || ''));
	}

	return selected;
}

function buildMachinerySpecsHtml(machine, kind = 'machinery') {
	if (kind === 'spare-parts') {
		const spareParts = Array.isArray(machine?.spareParts) ? machine.spareParts : [];
		if (spareParts.length) {
			return spareParts.slice(0, 5).map((part) => {
				const partName = part?.name || 'Spare Part';
				const partNumber = part?.partNumber ? ` <strong>(${part.partNumber})</strong>` : '';
				const notes = part?.notes ? ` - ${part.notes}` : '';
				return `<li><i class="fas fa-tools"></i> ${partName}${partNumber}${notes}</li>`;
			}).join('');
		}

		return `
			<li><i class="fas fa-tools"></i> Preventive maintenance kit scheduling and replacement alerts</li>
			<li><i class="fas fa-box-open"></i> Critical spare-part stock mapping for uninterrupted operations</li>
			<li><i class="fas fa-wrench"></i> Certified service procedures for high uptime performance</li>
		`;
	}

	const specs = machine?.technicalSpecs || {};
	const rows = [
		{ icon: 'fa-cogs', label: 'Model', value: specs.model },
		{ icon: 'fa-globe', label: 'Origin', value: specs.origin },
		{ icon: 'fa-tachometer-alt', label: 'Output', value: specs.output },
		{ icon: 'fa-bolt', label: 'Power', value: specs.power },
		{ icon: 'fa-shield-alt', label: 'Compliance', value: specs.compliance },
		{ icon: 'fa-tag', label: 'Price', value: formatMoney(machine?.price, machine?.currency, '') }
	].filter((row) => typeof row.value === 'string' && row.value.trim().length > 0);

	if (!rows.length) {
		return `
			<li><i class="fas fa-microchip"></i> PLC-driven sourcing visibility and batch traceability</li>
			<li><i class="fas fa-temperature-low"></i> Cold chain compatibility for temperature-sensitive shipments</li>
			<li><i class="fas fa-shield-alt"></i> ISO and regional compliance checkpoints pre-dispatch</li>
		`;
	}

	return rows.map((row) => `
		<li><i class="fas ${row.icon}"></i> <strong>${row.label}:</strong> ${row.value}</li>
	`).join('');
}

async function loadMachineryTechCards() {
	const scope = resolveMachineryScopeForPage();
	if (!scope) return;

	const cards = Array.from(document.querySelectorAll(`.tech-spec-card[data-machine-scope="${scope}"]`));
	if (!cards.length) return;

	try {
		const response = await fetch('/api/machinery');
		if (!response.ok) return;

		const payload = await response.json();
		const items = Array.isArray(payload?.data) ? payload.data : [];
		const usedIds = new Set();

		cards.forEach((card) => {
			const kind = String(card.getAttribute('data-machine-kind') || 'default').toLowerCase();
			const machine = pickMachineForCard(items, scope, kind, usedIds) || pickMachineryByScope(items, scope);
			if (!machine) return;

			const titleNode = card.querySelector('.tech-machine-title');
			if (titleNode) {
				if (kind === 'spare-parts') {
					titleNode.innerHTML = `${machine.name || 'Spare Parts'} <span>Maintenance</span>`;
				} else {
					titleNode.innerHTML = `${machine.name || 'Technical Specifications'} <span>Card</span>`;
				}
			}

			const specsNode = card.querySelector('.tech-machine-specs');
			if (specsNode) {
				specsNode.innerHTML = buildMachinerySpecsHtml(machine, kind);
			}

			const datasheetBtn = card.querySelector('.tech-machine-datasheet');
			if (datasheetBtn) {
				const datasheet = normalizeDatasheetUrl(machine?.datasheet || '');
				if (datasheet) {
					datasheetBtn.href = datasheet;
					datasheetBtn.classList.remove('is-disabled');
					datasheetBtn.removeAttribute('aria-disabled');
				} else {
					datasheetBtn.href = '#';
					datasheetBtn.classList.add('is-disabled');
					datasheetBtn.setAttribute('aria-disabled', 'true');
				}
			}
		});
	} catch (error) {
		// Keep default static card content if API is unavailable.
	}
}

window.loadProductDetails = loadProductDetails;

document.addEventListener('DOMContentLoaded', async () => {
	const langFromUrl = new URLSearchParams(window.location.search).get('lang');
	if (langFromUrl && SUPPORTED_LANGS.includes(langFromUrl)) {
		localStorage.setItem('selectedLang', langFromUrl);
	}

	await globalLoader();
	initGlobalLazyLoading();
	enforceHomeSuppression();
	await loadMachineryTechCards();
	await loadProductDetails();
	await fetchGemaBroadcast();
	loadPublicConciergeWidget();
});

document.addEventListener('languageChanged', async (event) => {
	const langFromEvent = event?.detail;
	if (typeof langFromEvent === 'string' && langFromEvent.trim()) {
		applyLanguageBodyClasses(langFromEvent.trim().toLowerCase());
	}
	await globalLoader();
	initGlobalLazyLoading();
	enforceHomeSuppression();
	await loadMachineryTechCards();
	await loadProductDetails();
});
