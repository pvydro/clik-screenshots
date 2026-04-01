import { getTemplate } from '../templates/index.js';

export function resolveLayout(scene, targetSize, theme) {
  const templateName = scene.template || 'device-centered';
  const template = getTemplate(templateName);

  if (!template) {
    throw new Error(`Unknown template: "${templateName}". Run 'clik-screenshots templates' to see available templates.`);
  }

  return template;
}
