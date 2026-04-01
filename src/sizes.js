export const SIZES = [
  { id: 'iphone-6.7', width: 1290, height: 2796, label: 'iPhone 6.7" (14/15/16 Pro Max)' },
  { id: 'iphone-6.5', width: 1284, height: 2778, label: 'iPhone 6.5" (11 Pro Max, XS Max)' },
  { id: 'iphone-5.5', width: 1242, height: 2208, label: 'iPhone 5.5" (8 Plus)' },
  { id: 'ipad-12.9',  width: 2048, height: 2732, label: 'iPad Pro 12.9"' },
];

export function getSizeById(id) {
  return SIZES.find(s => s.id === id);
}

export function resolveSizes(configSizes) {
  if (!configSizes || configSizes.length === 0) return SIZES;

  return configSizes.map(entry => {
    if (typeof entry === 'string') {
      const found = getSizeById(entry);
      if (!found) throw new Error(`Unknown size: "${entry}". Run 'clik-screenshots sizes' to see available sizes.`);
      return found;
    }
    // Custom size object: { id, width, height, label }
    if (entry.id && entry.width && entry.height) return entry;
    throw new Error(`Invalid size entry: ${JSON.stringify(entry)}`);
  });
}
