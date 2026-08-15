import { expect, test } from '@playwright/test'

test('affiche le tableau de bord', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Mooncello' })).toBeVisible()
})
