export const SIZES = [
  // iOS — App Store Connect required sizes
  { id: 'iphone-6.9', width: 1320, height: 2868, label: 'iPhone 6.9" (16 Pro Max)' },
  { id: 'iphone-6.7', width: 1290, height: 2796, label: 'iPhone 6.7" (14/15 Pro Max)' },
  { id: 'iphone-6.5', width: 1284, height: 2778, label: 'iPhone 6.5" (12/13/14 Pro Max)' },
  { id: 'iphone-6.5-alt', width: 1242, height: 2688, label: 'iPhone 6.5" (XS Max, 11 Pro Max)' },
  { id: 'iphone-5.5', width: 1242, height: 2208, label: 'iPhone 5.5" (8 Plus)' },
  { id: 'ipad-12.9',  width: 2048, height: 2732, label: 'iPad Pro 12.9"' },
  // Android
  { id: 'android-16x9',  width: 1080, height: 1920, label: 'Android Phone 16:9' },
  { id: 'android-20x9',  width: 1080, height: 2400, label: 'Android Phone 20:9' },
  { id: 'android-tab-7', width: 1200, height: 1920, label: 'Android 7" Tablet' },
  { id: 'android-tab-10', width: 1600, height: 2560, label: 'Android 10" Tablet' },
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
