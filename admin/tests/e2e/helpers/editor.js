import { expect } from '@playwright/test';
import { restNonce } from './rest.js';

/** The block editor canvas: WordPress renders post content in this iframe. */
export const CANVAS = 'iframe[name="editor-canvas"]';

/**
 * Locator root inside the canvas iframe. Use it for everything the post
 * content renders (blocks, placeholders, figures); the toolbar, inserter and
 * Inspector live in the top document.
 */
export function canvas(page) {
  return page.frameLocator(CANVAS);
}

/** The canvas Frame itself, for evaluate() inside the iframe's document. */
export async function canvasFrame(page) {
  const handle = await page.locator(CANVAS).elementHandle();
  if (!handle) throw new Error(`${CANVAS} is not in the page`);
  const frame = await handle.contentFrame();
  if (!frame) throw new Error(`${CANVAS} has no content frame`);
  return frame;
}

/** Cookie-authenticated call to a core wp/v2 route (writes need the nonce). */
export async function wpRest(request, method, route, data) {
  const nonce = await restNonce(request);
  const res = await request.fetch(`/wp-json/wp/v2/${route}`, {
    method,
    headers: { 'X-WP-Nonce': nonce },
    data
  });
  expect(res.ok(), `${method} /wp/v2/${route} → ${res.status()}: ${await res.text()}`).toBe(true);
  return res.json();
}

/**
 * Open a post in the block editor and wait until the canvas is ready. The
 * welcome guide is switched off through core/preferences (persisted per user)
 * and, if it still shows on this load, closed.
 */
export async function openPostEditor(page, postId) {
  await page.goto(`/wp-admin/post.php?post=${postId}&action=edit`);
  await page.waitForFunction(
    () => window.wp && window.wp.data && window.wp.data.select('core/editor').getCurrentPostId()
  );
  await page.evaluate(() => {
    const prefs = window.wp.data.dispatch('core/preferences');
    if (prefs && prefs.set) prefs.set('core/edit-post', 'welcomeGuide', false);
  });
  const guide = page.locator('.edit-post-welcome-guide, .components-guide');
  if (await guide.isVisible()) {
    await guide.getByRole('button', { name: /close/i }).click();
    await expect(guide).toBeHidden();
  }
  await expect(page.locator(CANVAS)).toBeAttached();
  await expect(canvas(page).locator('.editor-styles-wrapper').first()).toBeVisible();
}

/** Save the post with the keyboard shortcut and wait for a clean, saved state. */
export async function savePost(page) {
  expect(await page.evaluate(() => window.wp.data.select('core/editor').isEditedPostDirty())).toBe(true);
  await page.keyboard.press('ControlOrMeta+s');
  await page.waitForFunction(() => {
    const editor = window.wp.data.select('core/editor');
    return !editor.isSavingPost() && !editor.isEditedPostDirty();
  });
  expect(await page.evaluate(() => window.wp.data.select('core/editor').didPostSaveRequestSucceed())).toBe(true);
}
