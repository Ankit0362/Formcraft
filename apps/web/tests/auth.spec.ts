import { test, expect } from '@playwright/test';

// Use a unique email per test run so we don't conflict with existing users
const uniqueId = Math.floor(Math.random() * 1000000);
const testEmail = `playwright.test.${uniqueId}@example.com`;
const testPassword = 'Password123!';

test.describe('Authentication Flow', () => {
  test('should register a new user and login', async ({ page }) => {
    await page.goto('/auth');

    // 1. Switch to Register tab
    await page.getByRole('tab', { name: 'Register' }).click();

    // 2. Fill out registration form
    await page.getByPlaceholder('John Doe').fill('Playwright Tester');
    await page.getByPlaceholder('name@company.com').fill(testEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);
    
    // 3. Submit
    await page.getByRole('button', { name: 'Create Account' }).click();

    // 4. Verify we are redirected to the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 5. Verify the user dropdown contains our name or email
    const userMenuButton = page.locator('header').locator('button').last();
    await userMenuButton.click();
    await expect(page.locator('text=' + testEmail)).toBeVisible();

    // 6. Logout
    await page.getByRole('menuitem', { name: 'Log out' }).click();
    
    // 7. Verify we are back on auth or home page
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});
