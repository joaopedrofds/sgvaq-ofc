import { test, expect } from '@playwright/test'

test('landing page carrega corretamente', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('SGVAQ').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
})

test('login com credenciais inválidas mostra erro', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'naoexiste@test.com')
  await page.fill('input[type="password"]', 'senhaerrada')
  await page.click('button[type="submit"]')
  await expect(page.getByText('Email ou senha incorretos')).toBeVisible({ timeout: 10000 })
})

test('rota /dashboard sem login redireciona para /login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})
