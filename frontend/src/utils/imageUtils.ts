/**
 * FindIt Image Handling Utilities
 * 
 * Provides fallback images and zero-dependency SVG data URIs
 * to guarantee that images NEVER display as broken browser placeholders.
 */

export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  'Electronics': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  'Wallets & Bags': 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
  'Keys': 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80',
  'IDs & Cards': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
  'Clothing & Accessories': 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
  'Books & Stationery': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
  'Other': 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
};

/**
 * Returns a category or keyword-specific high quality image URL.
 */
export function getItemFallbackImage(title?: string, category?: string, type?: string): string {
  const combined = `${title || ''} ${category || ''}`.toLowerCase();

  if (combined.includes('bottle') || combined.includes('hydro') || combined.includes('flask')) {
    return 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80';
  }
  if (combined.includes('calculator') || combined.includes('ti-84')) {
    return 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=800&q=80';
  }
  if (combined.includes('necklace') || combined.includes('ring') || combined.includes('jewelry')) {
    return 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80';
  }
  if (combined.includes('watch')) {
    return 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80';
  }
  if (combined.includes('wallet') || combined.includes('cardholder') || combined.includes('purse')) {
    return 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80';
  }
  if (combined.includes('key') || combined.includes('fob') || combined.includes('lanyard')) {
    return 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80';
  }
  if (combined.includes('headphone') || combined.includes('earbud') || combined.includes('sony') || combined.includes('airpod')) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';
  }
  if (combined.includes('laptop') || combined.includes('xps') || combined.includes('macbook')) {
    return 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80';
  }

  if (category && CATEGORY_IMAGE_MAP[category]) {
    return CATEGORY_IMAGE_MAP[category];
  }

  if (type === 'lost') {
    return 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80';
}

/**
 * Returns an offline SVG placeholder data URI in FindIt brand theme colors.
 * This is 100% guaranteed to render in any browser even if external images are blocked.
 */
export function getOfflineSvgFallback(title: string = 'Campus Item', category: string = 'FindIt'): string {
  const safeTitle = title.replace(/["'&<>]/g, '').slice(0, 24);
  const safeCat = category.replace(/["'&<>]/g, '').slice(0, 18);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A1829" />
      <stop offset="50%" stop-color="#13111C" />
      <stop offset="100%" stop-color="#0E0D14" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#A855F7" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" />
  <circle cx="200" cy="100" r="44" fill="#6366F1" fill-opacity="0.12" stroke="#6366F1" stroke-width="1.5" stroke-opacity="0.3" />
  <path d="M185 108 L200 93 L215 108 M192 101 L192 115 L208 115 L208 101" fill="none" stroke="#A855F7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="200" cy="85" r="5" fill="#6366F1" />
  <text x="200" y="165" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="700" fill="#F3F4F6" text-anchor="middle">${safeTitle}</text>
  <rect x="150" y="180" width="100" height="20" rx="10" fill="#6366F1" fill-opacity="0.15" />
  <text x="200" y="194" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="10" font-weight="600" fill="#C084FC" text-anchor="middle">${safeCat}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns a sleek SVG avatar data URI based on user initials.
 */
export function getAvatarFallback(name: string = 'User'): string {
  const initials = (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'U';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6F8B74" />
      <stop offset="100%" stop-color="#5A735E" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="64" fill="url(#avatarGrad)" />
  <text x="64" y="74" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="44" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
