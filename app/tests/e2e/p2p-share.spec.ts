import { expect, Page, test } from '@playwright/test';

const FILE_CONTENT = 'playwright-p2p-demo';

const setText = async (page: Page, selector: string, value: string) => {
  await page.locator(selector).fill('');
  await page.locator(selector).fill(value);
};

test('manual signaling works across two browser instances and session stays reusable', async ({ browser, baseURL }) => {
  const senderContext = await browser.newContext();
  const receiverContext = await browser.newContext();
  await senderContext.grantPermissions(['clipboard-read', 'clipboard-write']);
  await receiverContext.grantPermissions(['clipboard-read', 'clipboard-write']);

  const senderPage = await senderContext.newPage();
  const receiverPage = await receiverContext.newPage();

  await Promise.all([senderPage.goto(baseURL || '/'), receiverPage.goto(baseURL || '/')]);

  await senderPage.getByText('P2P file sharing with WebRTC + QR').waitFor();
  await receiverPage.getByText('P2P file sharing with WebRTC + QR').waitFor();

  const senderSection = senderPage.locator('section').filter({ hasText: 'Sender' });
  const receiverSection = receiverPage.locator('section').filter({ hasText: 'Receiver' });

  const filePayload = {
    name: 'playwright.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(FILE_CONTENT, 'utf-8')
  };

  await senderSection.locator('input[type="file"]').setInputFiles(filePayload);
  await senderSection.getByRole('button', { name: 'Generate Sender QR' }).click();
  await expect(senderPage.getByText('Sender QR ready. Receiver should scan it and return an answer QR.')).toBeVisible();

  await senderPage.getByRole('button', { name: 'Copy latest signal text' }).click();
  const offerText = await senderPage.evaluate(() => navigator.clipboard.readText());
  expect(offerText.startsWith('fswebrtc')).toBeTruthy();

  await setText(receiverPage, 'textarea[placeholder="Paste fswebrtc payload here"]', offerText);
  await receiverPage.getByRole('button', { name: 'Treat as Offer' }).click();
  await expect(receiverPage.getByText('Answer QR ready. Sender should scan this QR to start transfer.')).toBeVisible();

  await receiverPage.getByRole('button', { name: 'Copy latest signal text' }).click();
  const answerText = await receiverPage.evaluate(() => navigator.clipboard.readText());
  expect(answerText.startsWith('fswebrtc')).toBeTruthy();

  await setText(senderPage, 'textarea[placeholder="Paste fswebrtc payload here"]', answerText);
  await senderPage.getByRole('button', { name: 'Treat as Answer' }).click();

  await expect(senderPage.getByText('File sent successfully')).toBeVisible();
  await expect(receiverPage.getByText('File received successfully')).toBeVisible();
  await expect(receiverSection.getByRole('link', { name: /Download received file/ })).toBeVisible();
  await expect(senderPage.getByText('File sent. Session is still active.')).toBeVisible();

  const secondFilePayload = {
    name: 'playwright-2.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('second-file', 'utf-8')
  };

  await senderSection.locator('input[type="file"]').setInputFiles(secondFilePayload);
  await senderSection.getByRole('button', { name: 'Send Selected File' }).click();

  await expect(senderPage.getByText('File sent successfully')).toBeVisible();
  await expect(receiverPage.getByText('File received successfully')).toBeVisible();

  await senderSection.getByRole('button', { name: 'End Session' }).click();
  await expect(senderPage.getByText('Status: Session ended')).toBeVisible();

  await senderContext.close();
  await receiverContext.close();
});
