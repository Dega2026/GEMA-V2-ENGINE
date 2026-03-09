/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const requiredEnv = [
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'MONGO_URI'
];

const recommendedEnv = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'AI_API_KEY',
  'DAILY_REPORT_TO',
  'DAILY_REPORT_LANG',
  'ENABLE_DAILY_AI_REPORT'
];

const requiredFiles = [
  'backend/routes/aiRoutes.js',
  'backend/utils/aiClient.js',
  'backend/scripts/dailyReport.js',
  'frontend/src/js/admin-ai-widget.js',
  'frontend/src/pages/pharmacy-landing.html',
  'frontend/src/js/pharmacy-landing.js'
];

function readFileSafe(relPath) {
  const fullPath = path.join(__dirname, relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf8');
}

function checkEnv() {
  const missingRequired = requiredEnv.filter((key) => !String(process.env[key] || '').trim());
  const missingRecommended = recommendedEnv.filter((key) => !String(process.env[key] || '').trim());

  if (missingRequired.length) {
    console.error('Missing required env vars:', missingRequired.join(', '));
    return false;
  }

  if (missingRecommended.length) {
    console.warn('Missing recommended env vars:', missingRecommended.join(', '));
  }

  console.log('Environment variables: OK');
  return true;
}

function checkFiles() {
  const missingFiles = requiredFiles.filter((relPath) => !fs.existsSync(path.join(__dirname, relPath)));
  if (missingFiles.length) {
    console.error('Missing required files:', missingFiles.join(', '));
    return false;
  }

  console.log('Critical files: OK');
  return true;
}

function checkServerWiring() {
  const serverText = readFileSafe('backend/server.js');
  const adminText = readFileSafe('frontend/src/pages/admin.html');
  const productsText = readFileSafe('frontend/src/pages/products.html');
  const hubText = readFileSafe('frontend/src/pages/hub.html');
  const pharmacyLandingText = readFileSafe('frontend/src/pages/pharmacy-landing.html');
  const sidebarMapText = readFileSafe('frontend/src/components/SidebarMap.js');

  const checks = [
    { label: 'AI route mounted', pass: serverText.includes('app.use("/api/ai"') },
    { label: 'Pharmacy page route mounted', pass: serverText.includes('app.get("/pharmacy/:slug"') },
    { label: 'Admin AI widget loaded', pass: adminText.includes('/js/admin-ai-widget.js') },
    { label: 'SidebarMap removed from products page', pass: !productsText.includes('../components/SidebarMap.js') },
    { label: 'Empire Hub page exists', pass: hubText.includes('hub-grid') && hubText.includes('smap_world_mfg_title') },
    { label: 'Pharmacy landing script loaded', pass: pharmacyLandingText.includes('../js/pharmacy-landing.js') },
    { label: 'Sidebar links to product page filters', pass: sidebarMapText.includes('/products?origin=') }
  ];

  const failed = checks.filter((item) => !item.pass);
  checks.forEach((item) => {
    console.log(`${item.pass ? 'OK' : 'FAIL'} - ${item.label}`);
  });

  return failed.length === 0;
}

(function run() {
  const envOk = checkEnv();
  const filesOk = checkFiles();
  const wiringOk = checkServerWiring();

  if (!envOk || !filesOk || !wiringOk) {
    console.error('Deployment precheck failed. Resolve issues before release.');
    process.exit(1);
  }

  console.log('Deployment precheck passed. GEMA-V2 is ready for release.');
})();
