const { chromium } = require('playwright');

const FRONT = 'http://localhost:32501';
const API = 'http://localhost:32551/api';
const VIEWS = ['/', '/operations', '/reception/new', '/clients', '/finances', '/cash-desk', '/debts', '/charges', '/activity', '/discounts', '/tasks', '/users', '/sites', '/configuration'];

const settle = (page) => page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME });
  const context = await browser.newContext();
  const page = await context.newPage();
  let log = [];
  page.on('request', (request) => {
    if (request.url().startsWith(API) && request.method() !== 'OPTIONS') log.push(`${request.method()} ${request.url().slice(API.length)}`);
  });
  await page.goto(`${FRONT}/login`);
  await settle(page);
  const token = await page.evaluate(async (api) => {
    const response = await fetch(`${api}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: 'm.taibi@oleoziza.ma', secret: 'Oleoziza2026', method: 'email_password' }) });
    return (await response.json()).accessToken;
  }, API);
  await page.evaluate((value) => localStorage.setItem('oleoziza.auth.accessToken', JSON.stringify(value)), token);
  log = [];
  const results = [];
  const first = { view: 'app start + /', requests: [] };
  await page.goto(`${FRONT}/`);
  await settle(page);
  first.requests = log;
  results.push(first);
  for (const view of VIEWS.slice(1)) {
    log = [];
    await page.evaluate((path) => document.querySelector('#app').__vue_app__.config.globalProperties.$router.push(path), view);
    await settle(page);
    results.push({ view, requests: log });
  }
  log = [];
  await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$router.back());
  await settle(page);
  results.push({ view: 'back to /sites', requests: log });
  log = [];
  await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$router.push('/operations'));
  await page.waitForTimeout(16000);
  results.push({ view: '/operations, 16 s visible (poll)', requests: log });
  console.log(JSON.stringify(results, null, 1));
  await browser.close();
})();
