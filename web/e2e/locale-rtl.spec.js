import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const auth = JSON.parse(fs.readFileSync(path.join(__dirname, '.auth/visitor.json'), 'utf8'))

const ROUTES = ['/', '/hosts', '/available-ips', '/networks']

async function seedSession(page, language) {
  await page.addInitScript(
    ({ visitorToken, lang }) => {
      localStorage.setItem('visitorToken', visitorToken)
      localStorage.setItem('language', lang)
    },
    { visitorToken: auth.visitorToken, lang: language }
  )
}

for (const language of ['en', 'ar']) {
  for (const route of ROUTES) {
    test(`${route} — ${language} lang & direction`, async ({ page }) => {
      await seedSession(page, language)
      await page.goto(route)
      await expect(page.locator('html')).toHaveAttribute('lang', language, { timeout: 15_000 })
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr')
    })
  }
}

test('English uses 17px root, Arabic uses 16px', async ({ page }) => {
  await seedSession(page, 'en')
  await page.goto('/')
  const enSize = await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize)
  expect(enSize).toBe('17px')

  await seedSession(page, 'ar')
  await page.goto('/')
  const arSize = await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize)
  expect(arSize).toBe('16px')
})

test('IP addresses render LTR', async ({ page }) => {
  await seedSession(page, 'ar')
  await page.goto('/hosts')
  const ip = page.locator('.ip-address').first()
  await expect(ip).toBeVisible({ timeout: 15_000 })
  await expect(ip).toHaveAttribute('dir', 'ltr')
})

test('mobile nav shows short labels', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seedSession(page, 'ar')
  await page.goto('/')
  await expect(page.locator('.nav-link-label-short').first()).toBeVisible()
  await expect(page.locator('.nav-link-label-full').first()).toBeHidden()
})

test('nav buttons expose tooltips', async ({ page }) => {
  await seedSession(page, 'en')
  await page.goto('/')
  const homeNav = page.locator('.nav-link').first()
  await expect(homeNav).toHaveAttribute('title', /.+/ )
  await expect(homeNav).toHaveAttribute('aria-label', /.+/ )
})
