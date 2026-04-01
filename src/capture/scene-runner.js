export async function runSceneSetup(page, scene, adapter) {
  if (adapter && adapter.setupScene) {
    await adapter.setupScene(page, scene);
    return;
  }

  // Generic setup — execute actions sequentially
  for (const action of (scene.setup || [])) {
    switch (action.action) {
      case 'eval':
        await page.evaluate(action.code);
        break;

      case 'wait':
        await new Promise(r => setTimeout(r, action.ms || 500));
        break;

      case 'click':
        if (action.selector) {
          await page.click(action.selector);
        } else if (action.position) {
          await page.mouse.click(action.position.x, action.position.y);
        }
        break;

      case 'waitForSelector':
        await page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
        break;

      default:
        console.warn(`    Unknown action: ${action.action}`);
    }
  }

  // Wait for any specified post-setup delay
  if (scene.waitMs) {
    await new Promise(r => setTimeout(r, scene.waitMs));
  }
}
