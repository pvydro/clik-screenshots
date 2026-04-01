// Generic adapter — uses raw eval commands from scene config.
// This is the default; scene-runner.js handles it directly.

export const genericAdapter = {
  name: 'generic',
  detect: () => true, // Always available as fallback

  async setupScene(page, scene) {
    // Delegate to default scene-runner behavior (no-op here, handled by runner)
    return null;
  },
};
