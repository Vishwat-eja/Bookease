import { test, expect } from '@playwright/test';

test.describe('BookEase End-to-End Booking Flow', () => {
  test('Customer should select service, staff, slot, enter details, pay deposit, and see confirmation with PDF download', async ({ page }) => {
    // 1. Visit demo business page /b/glow-style
    await page.goto('http://localhost:3000/b/glow-style');
    await expect(page.locator('h1')).toContainText('Glow & Style Salon');

    // 2. Select Haircut service (Step 1 -> Step 2)
    await page.click('text=Haircut & Precision Styling');

    // 3. Select Any Available Staff (Step 2 -> Step 3)
    await page.click('text=Any Available Staff');

    // 4. Select a time slot (Step 3 -> Step 4)
    const slotButton = page.locator('button:has-text("AM"), button:has-text("PM")').first();
    await slotButton.click();
    await page.click('text=Continue to Details');

    // 5. Fill customer details (Step 4 -> Step 5)
    await page.fill('input[placeholder="Jane Davis"]', 'Test Customer');
    await page.fill('input[placeholder="jane@example.com"]', 'test.customer@example.com');
    await page.click('text=Proceed to Payment');

    // 6. Pay deposit (Step 5 -> Step 6)
    await page.click('button:has-text("Pay")');

    // 7. Verify booking confirmation screen & PDF download link
    await expect(page.locator('h2')).toContainText('Booking Confirmed!');
    await expect(page.locator('text=Download PDF Invoice')).toBeVisible();
  });
});
