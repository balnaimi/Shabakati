import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const auth = JSON.parse(fs.readFileSync(path.join(__dirname, '.auth/visitor.json'), 'utf8'))

const ROUTES = ['/', '/hosts', '/available-ips', '/networks', '/uptime', '/settings']

async function seedSession(page, language) {
  await page.addInitScript(
    ({ visitorToken, lang }) => {
      localStorage.setItem('visitorToken', visitorToken)
      localStorage.setItem('language', lang)
      document.documentElement.lang = lang
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
      navigator.serviceWorker?.getRegistrations?.().then((regs) => {
        regs.forEach((r) => r.unregister())
      })
    },
    { visitorToken: auth.visitorToken, lang: language }
  )
}

async function waitForAppShell(page) {
  await page.locator('.language-toggle').waitFor({ state: 'visible', timeout: 20_000 })
}

async function gotoAuthenticated(page, route, language) {
  await seedSession(page, language)
  await page.goto(route)
  await waitForAppShell(page)
}

async function ensureLocale(page, language) {
  const lang = await page.locator('html').getAttribute('lang')
  if (lang !== language) {
    await page.locator('.language-toggle').click()
  }
  await expect(page.locator('html')).toHaveAttribute('lang', language, { timeout: 15_000 })
  await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr')
}

for (const language of ['en', 'ar']) {
  for (const route of ROUTES) {
    test(`${route} — ${language} lang & direction`, async ({ page }) => {
      await gotoAuthenticated(page, route, language)
      await ensureLocale(page, language)
    })
  }
}

test('English uses 17px root, Arabic uses 16px', async ({ page }) => {
  await gotoAuthenticated(page, '/', 'en')
  const enSize = await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize)
  expect(enSize).toBe('17px')

  await gotoAuthenticated(page, '/', 'ar')
  await ensureLocale(page, 'ar')
  const arSize = await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize)
  expect(arSize).toBe('16px')
})

test('IP lines align to inline-start in Arabic', async ({ page }) => {
  await gotoAuthenticated(page, '/hosts', 'ar')
  await ensureLocale(page, 'ar')
  const line = page.locator('.tag-item .ip-line').first()
  await expect(line).toBeVisible({ timeout: 15_000 })
  const align = await line.evaluate((el) => getComputedStyle(el).textAlign)
  expect(['start', 'right']).toContain(align)
  await expect(line.locator('.ip-address')).toHaveAttribute('dir', 'ltr')
})

test('IP addresses render LTR', async ({ page }) => {
  await gotoAuthenticated(page, '/hosts', 'ar')
  await ensureLocale(page, 'ar')
  const ip = page.locator('.ip-address').first()
  await expect(ip).toBeVisible({ timeout: 15_000 })
  await expect(ip).toHaveAttribute('dir', 'ltr')
})

test('mobile nav shows short labels', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await gotoAuthenticated(page, '/', 'ar')
  await ensureLocale(page, 'ar')
  await expect(page.locator('.nav-link-label-short').first()).toBeVisible()
  await expect(page.locator('.nav-link-label-full').first()).toBeHidden()
})

test('uptime page shows offline host below 100%', async ({ page }) => {
  await gotoAuthenticated(page, '/uptime', 'en')
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
  const row = page.locator('table tbody tr').filter({ hasText: '192.168.55.20' })
  await expect(row).toBeVisible({ timeout: 5_000 })
  const text = await row.textContent()
  expect(text).toMatch(/0\.0\s*%|offline/i)
  expect(text).not.toMatch(/100\.0\s*%/)
})

test('settings page loads version info', async ({ page }) => {
  await gotoAuthenticated(page, '/settings', 'en')
  await expect(page.getByRole('heading', { name: /settings|الإعدادات/i })).toBeVisible()
  await expect(page.locator('.settings-meta')).toBeVisible({ timeout: 15_000 })
})
