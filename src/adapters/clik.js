// clik-engine adapter
// Maps clik concepts (director, scenes, entities) to screenshot setup actions.
// Auto-detects clik-engine via window.__CLIK_GAME.

export const clikAdapter = {
  name: 'clik',

  async detect(page) {
    return page.evaluate(() => !!window.__CLIK_GAME);
  },

  async setupScene(page, scene) {
    // Navigate to scene via director
    if (scene.scene) {
      await page.evaluate((sceneName) => {
        const game = window.__CLIK_GAME;
        if (game && game.director) {
          game.director.go(sceneName);
        }
      }, scene.scene);
    }

    // Execute setup actions with clik-specific action types
    for (const action of (scene.setup || [])) {
      switch (action.action) {
        case 'waitForScene':
          // Wait for CLIK:SCENE create log by polling
          await page.evaluate((timeout) => {
            return new Promise((resolve) => {
              const start = Date.now();
              const check = () => {
                if (Date.now() - start > timeout) { resolve(); return; }
                setTimeout(check, 100);
              };
              check();
            });
          }, action.timeout || 3000);
          break;

        case 'setState':
          await page.evaluate(({ key, value }) => {
            const game = window.__CLIK_GAME;
            if (game && game.state) {
              game.state.set(key, value);
            }
          }, { key: action.key, value: action.value });
          break;

        case 'disableDebug':
          await page.evaluate(() => {
            const game = window.__CLIK_GAME;
            if (game && game.debug) {
              game.debug.enabled = false;
              // Hide overlay elements
              const overlays = document.querySelectorAll('[data-clik-debug]');
              overlays.forEach(el => el.style.display = 'none');
            }
          });
          break;

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

        default:
          console.warn(`    Unknown clik action: ${action.action}`);
      }
    }

    if (scene.waitMs) {
      await new Promise(r => setTimeout(r, scene.waitMs));
    }
  },
};
