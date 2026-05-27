import { test, expect } from '@playwright/test';

test.describe('Public Form Filling', () => {
  let formUrl = '';

  test.beforeAll(async ({ browser }) => {
    // We need a form to exist. We can do this via UI in setup, 
    // but a robust test would seed the DB directly.
    // For this e2e test, we will create a quick form via UI
    // using a separate context.
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const uniqueId = Math.floor(Math.random() * 1000000);
    const testEmail = `playwright.share.${uniqueId}@example.com`;
    
    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Register' }).click();
    await page.getByPlaceholder('John Doe').fill('Share Tester');
    await page.getByPlaceholder('name@company.com').fill(testEmail);
    await page.getByPlaceholder('••••••••').fill('Password123!');
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByRole('button', { name: 'Create New Form' }).click();
    
    const scratchBtn = page.locator('button', { hasText: /Scratch/i });
    if (await scratchBtn.isVisible()) await scratchBtn.click();

    await page.getByPlaceholder('e.g. USER_ONBOARDING_V2').fill('Share Test Form');
    await page.getByRole('button', { name: 'Create Form' }).click();

    await expect(page).toHaveURL(/\/forms\/.*\/edit/);
    
    // Add a text field
    await page.getByRole('button', { name: 'Short Text' }).click();
    await page.getByRole('button', { name: /Save Form/i }).click();
    await expect(page.locator('text=saved')).toBeVisible();

    // Get the URL
    await page.getByRole('button', { name: /View Live/i }).click();
    
    // The new tab will open, but we can just construct the URL
    const url = page.url();
    const match = url.match(/\/forms\/([^/]+)\/edit/);
    if (match) {
      formUrl = `/share/${match[1]}`;
    }

    await context.close();
  });

  test('should load form and submit successfully', async ({ page }) => {
    test.skip(!formUrl, 'Form URL was not created');
    
    await page.goto(formUrl);

    // 1. Start form
    await page.getByRole('button', { name: /Start Questionnaire/i }).click();

    // 2. Fill short text field (which defaults to "What is your name?")
    await page.getByPlaceholder('Your answer...').fill('Playwright Test Answer');
    
    // 3. Submit
    await page.getByRole('button', { name: /Submit/i }).click();

    // 4. Verify success
    await expect(page).toHaveURL(/\/share\/.*\/success/);
    await expect(page.locator('text=Thank you for your response!')).toBeVisible();
  });
});
