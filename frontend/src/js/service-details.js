const SERVICE_SUPPORTED_LANGS = ['ar', 'en', 'de', 'zh', 'tr'];
const serviceUrlParams = new URLSearchParams(window.location.search);
const serviceKey = serviceUrlParams.get('service');
let serviceContentCache = null;

const emergencyFallback = {
  serviceMeta: {
    overviewTitle: 'Overview',
    benefitsTitle: 'Key Benefits',
    requestTitle: 'Request This Service',
    namePlaceholder: 'Your Name',
    emailPlaceholder: 'Business Email',
    submitLabel: 'Submit Request'
  },
  fallback: {
    title: 'Service Not Found',
    subtitle: '',
    tag: 'Error',
    desc: 'Please return and select a valid service.',
    subject: 'General Inquiry',
    image: '/assets/images/default-bg.jpg',
    benefits: []
  },
  services: {}
};

async function loadServiceContentFromApi() {
  if (serviceContentCache) {
    return serviceContentCache;
  }

  const response = await fetch('/api/pages/service-details?includeAll=1');
  if (!response.ok) {
    throw new Error('Failed to fetch service-details payload');
  }

  const payload = await response.json();
  if (!payload.success || !payload.content) {
    throw new Error('Invalid service-details payload');
  }

  serviceContentCache = payload.content;
  return serviceContentCache;
}

function getLocalizedPayload(contentByLang) {
  const selectedLang = localStorage.getItem('selectedLang') || 'en';
  const lang = SERVICE_SUPPORTED_LANGS.includes(selectedLang) ? selectedLang : 'en';
  return {
    lang,
    localized: contentByLang?.[lang] || contentByLang?.en || emergencyFallback
  };
}

function applyServiceMeta(meta) {
  const safeMeta = meta || {};
  document.getElementById('s-overview-title').innerText = safeMeta.overviewTitle || 'Overview';
  document.getElementById('s-benefits-title').innerText = safeMeta.benefitsTitle || 'Key Benefits';
  document.getElementById('s-request-title').innerText = safeMeta.requestTitle || 'Request This Service';
  document.getElementById('s-name').setAttribute('placeholder', safeMeta.namePlaceholder || 'Your Name');
  document.getElementById('s-email').setAttribute('placeholder', safeMeta.emailPlaceholder || 'Business Email');
  document.getElementById('s-submit-btn').innerText = safeMeta.submitLabel || 'Submit Request';
}

function applyServiceContent(serviceData, fallbackData) {
  const active = serviceData || fallbackData;
  document.getElementById('s-title').innerText = active?.title || fallbackData.title;
  document.getElementById('s-subtitle').innerText = active?.subtitle || '';
  document.getElementById('s-tag').innerText = active?.tag || active?.title || fallbackData.tag;
  document.getElementById('s-desc').innerText = active?.desc || fallbackData.desc;
  document.getElementById('s-subject').value = active?.subject || fallbackData.subject;

  const image = active?.image || fallbackData.image || '/assets/images/default-bg.jpg';
  document.getElementById('hero-section').style.backgroundImage = `url('${image}')`;

  const benefitsContainer = document.getElementById('s-benefits');
  benefitsContainer.innerHTML = '';
  const benefits = Array.isArray(active?.benefits) ? active.benefits : [];
  benefits.forEach((benefit) => {
    benefitsContainer.insertAdjacentHTML('beforeend', `<li><i class="fas fa-check-circle"></i> ${benefit}</li>`);
  });
}

async function updateServiceContent() {
  let contentByLang;
  try {
    contentByLang = await loadServiceContentFromApi();
  } catch (error) {
    contentByLang = { en: emergencyFallback };
  }

  const { lang, localized } = getLocalizedPayload(contentByLang);
  const fallbackData = localized.fallback || emergencyFallback.fallback;
  const selectedService = serviceKey ? localized?.services?.[serviceKey] : null;

  applyServiceMeta(localized.serviceMeta || emergencyFallback.serviceMeta);
  applyServiceContent(selectedService, fallbackData);

  const body = document.querySelector('.service-body');
  body.style.direction = lang === 'ar' ? 'rtl' : 'ltr';
  body.style.textAlign = lang === 'ar' ? 'right' : 'left';
}

updateServiceContent();
document.addEventListener('languageChanged', updateServiceContent);
