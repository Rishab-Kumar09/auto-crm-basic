import { test, expect } from '@playwright/test';

test('basic auth flow - can login as admin', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:8080/');

  // Fill in login form
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'admin123456');
  
  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation and verify we're logged in by checking for the logout button
  await expect(page.getByRole('button', { name: /logout/i })).toBeVisible({ timeout: 10000 });
});

test('basic auth flow - can login as customer', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:8080/');

  // Fill in login form
  await page.fill('input[type="email"]', 'customer1@test.com');
  await page.fill('input[type="password"]', 'customer123456');
  
  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation and verify we're logged in by checking for the logout button
  await expect(page.getByRole('button', { name: /logout/i })).toBeVisible({ timeout: 10000 });

  // Verify customer-specific UI element (Create Ticket button on tickets page)
  await page.getByRole('button', { name: 'Tickets' }).click();
  await expect(page.getByRole('button', { name: /create ticket/i })).toBeVisible({ timeout: 10000 });
});

test('can create a new ticket', async ({ page }) => {
  try {
    // Login first as customer
    await page.goto('http://localhost:8080/');
    console.log('Navigated to login page');
    
    await page.fill('input[type="email"]', 'customer1@test.com');
    await page.fill('input[type="password"]', 'customer123456');
    console.log('Filled in login credentials');
    
    await page.click('button[type="submit"]');
    console.log('Clicked submit button');
    
    // Wait for login
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible({ timeout: 10000 });
    console.log('Successfully logged in, logout button visible');

    // Navigate to tickets page using the sidebar button
    const ticketsButton = page.getByRole('button', { name: 'Tickets' });
    await expect(ticketsButton).toBeVisible({ timeout: 10000 });
    console.log('Tickets button found in sidebar');
    
    await ticketsButton.click();
    console.log('Clicked tickets button');

    // Wait for Create Ticket button
    const createTicketButton = page.getByRole('button', { name: /create ticket/i });
    await expect(createTicketButton).toBeVisible({ timeout: 10000 });
    console.log('Create Ticket button visible');
    
    await createTicketButton.click();
    console.log('Clicked Create Ticket button');

    // Fill in ticket details
    await page.getByPlaceholder('Ticket title').fill('Test Ticket');
    console.log('Filled in ticket title');

    // Fill in the rich text editor
    const editor = page.locator('[contenteditable="true"]');
    await editor.click();
    await editor.type('This is a test ticket');
    console.log('Filled in ticket description');

    // Select a company (required field)
    const companySelect = page.getByRole('combobox');
    await companySelect.click();
    await page.getByRole('option').first().click();
    console.log('Selected company');
    
    await page.getByRole('button', { name: /create/i }).click();
    console.log('Clicked create button');

    // Verify ticket was created by checking for success message in toast
    await expect(page.locator('[data-component-name="ToastDescription"]')).toHaveText('Ticket created successfully.', { timeout: 10000 });
    console.log('Success message visible');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
});

test('can add a comment to a ticket', async ({ page }) => {
  try {
    // Login first as customer
    await page.goto('http://localhost:8080/');
    console.log('Navigated to login page');
    
    await page.fill('input[type="email"]', 'customer1@test.com');
    await page.fill('input[type="password"]', 'customer123456');
    console.log('Filled in login credentials');
    
    await page.click('button[type="submit"]');
    console.log('Clicked submit button');
    
    // Wait for login
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible({ timeout: 10000 });
    console.log('Successfully logged in, logout button visible');

    // Navigate to tickets page using the sidebar button
    const ticketsButton = page.getByRole('button', { name: 'Tickets' });
    await expect(ticketsButton).toBeVisible({ timeout: 10000 });
    console.log('Tickets button found in sidebar');
    
    await ticketsButton.click();
    console.log('Clicked tickets button');

    // Wait for tickets to load and click the first ticket with our title
    const ticketTitle = page.getByRole('heading', { name: 'Test Ticket' }).first();
    await expect(ticketTitle).toBeVisible({ timeout: 10000 });
    console.log('Test ticket visible');
    
    await ticketTitle.click();
    console.log('Clicked test ticket');

    // Add a comment using the rich text editor
    const editor = page.locator('[contenteditable="true"]');
    await editor.click();
    await editor.type('This is a test comment');
    console.log('Filled in comment');
    
    await page.getByRole('button', { name: /send comment/i }).click();
    console.log('Clicked send comment button');

    // Verify comment was added
    await expect(page.getByText('This is a test comment')).toBeVisible({ timeout: 10000 });
    console.log('Comment visible');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}); 