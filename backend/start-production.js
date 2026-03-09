/* eslint-disable no-console */

// Cross-platform production bootstrap for Hostinger deployment.
process.env.NODE_ENV = 'production';
if (!String(process.env.ENABLE_DAILY_AI_REPORT || '').trim()) {
  process.env.ENABLE_DAILY_AI_REPORT = 'true';
}

require('./server');
