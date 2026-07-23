import { test, expect } from '@playwright/test';

// Next.js startup could take a while
test.describe.configure({ mode: 'parallel', timeout: 60000 });

test.describe('AI Assistant Tab', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to the chat tab to avoid multiple 'Chat' buttons confusing playwright
    await page.goto('/?assistant=chat');
  });

  test('should open the AI Assistant tab', async ({ page }) => {
    // Check if the chat input is visible
    const input = page.getByPlaceholder(/Hỏi về điểm thi|Hỏi về file vừa đính kèm/i);
    await expect(input).toBeVisible({ timeout: 20000 });
    
    // Wait for the input to be ready
    await expect(input).toBeEnabled();
  });

  test('should allow sending a message and show pending state', async ({ page }) => {
    const input = page.getByPlaceholder(/Hỏi về điểm thi|Hỏi về file vừa đính kèm/i);
    await input.fill('Điểm Toán theo vùng?');
    
    // Press Enter to send
    await input.press('Enter');

    // Wait for user message to appear in the chat area
    await expect(page.getByText('Điểm Toán theo vùng?').last()).toBeVisible();
  });

  test('should allow attaching different types of files', async ({ page }) => {
    // Create dummy files for testing
    const testCsv = Buffer.from('id,name\n1,test');
    const testPng = Buffer.from('fake-png-data');
    
    // Find the file input
    const fileInput = page.locator('input[type="file"]');
    
    // Mock the backend analyze API
    await page.route('**/*analyze*', async route => {
      const request = route.request();
      const postData = request.postData();
      if (postData?.includes('image.png')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'img-123', filename: 'image.png', kind: 'image', summary: 'A nice image', data_url: 'data:image/png;base64,...' })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'csv-123', filename: 'data.csv', kind: 'document', summary: 'Test CSV data' })
        });
      }
    });

    // Upload files
    await fileInput.setInputFiles([
      { name: 'data.csv', mimeType: 'text/csv', buffer: testCsv },
      { name: 'image.png', mimeType: 'image/png', buffer: testPng }
    ]);
    
    // Check if attachment badges appear
    await expect(page.getByText('data.csv', { exact: false })).toBeVisible();
    await expect(page.getByText('image.png', { exact: false })).toBeVisible();
    
    // Mock the generate API to avoid error on send
    await page.route('**/generate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', answer_type: 'text', explanation: 'Done' })
      });
    });

    // Send a message with the attachments
    const textInput = page.getByPlaceholder(/Hỏi về file vừa đính kèm/i);
    await textInput.fill('Phân tích file này');
    await textInput.press('Enter');
    
    // Message should be visible
    await expect(page.getByText('Phân tích file này').last()).toBeVisible();
    
    // The attachments should be cleared from the input area
    await expect(page.getByText('data.csv', { exact: false })).not.toBeVisible();
  });
});
