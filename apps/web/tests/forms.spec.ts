import { test, expect } from '@playwright/test';

const uniqueId = Math.floor(Math.random() * 1000000);
const testEmail = `playwright.forms.${uniqueId}@example.com`;
const testPassword = 'Password123!';

test.describe('Form Creation and Editing', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Register a user for this suite
    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Register' }).click();
    await page.getByPlaceholder('John Doe').fill('Form Tester');
    await page.getByPlaceholder('name@company.com').fill(testEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should create a new form and add a question', async ({ page }) => {
    // 1. Create Form
    await page.getByRole('button', { name: 'Create New Form' }).click();
    
    // Choose start from scratch (assuming there's a button or it's default)
    const scratchBtn = page.locator('button', { hasText: /Scratch/i });
    if (await scratchBtn.isVisible()) {
      await scratchBtn.click();
    }

    // Fill dialog
    await page.getByPlaceholder('e.g. USER_ONBOARDING_V2').fill('E2E Test Form');
    await page.getByRole('button', { name: 'Create Form' }).click();

    // 2. Verify we are in the editor
    await expect(page).toHaveURL(/\/forms\/.*\/edit/);
    await expect(page.locator('h1')).toContainText('E2E Test Form');

    // 3. Add a field
    await page.getByRole('button', { name: 'Short Text' }).click();
    
    // 4. Verify field is added
    const fieldInput = page.locator('input[value="What is your name?"]');
    await expect(fieldInput).toBeVisible();

    // 5. Save the form
    await page.getByRole('button', { name: /Save Form/i }).click();
    
    // Wait for the success toast
    await expect(page.locator('text=saved')).toBeVisible();
  });
});
