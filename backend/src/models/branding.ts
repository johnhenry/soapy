export interface Branding {
  logoUrl: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  footerText?: string;
  versionTimestamp: Date;
}

export function validateBranding(branding: unknown): branding is Branding {
  if (typeof branding !== 'object' || branding === null) return false;
  const b = branding as Partial<Branding>;

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const isValidHexColor = (color: string) => /^#[0-9A-Fa-f]{6}$/.test(color);

  return (
    typeof b.logoUrl === 'string' &&
    isValidUrl(b.logoUrl) &&
    typeof b.primaryColor === 'string' &&
    isValidHexColor(b.primaryColor) &&
    (b.secondaryColor === undefined ||
      (typeof b.secondaryColor === 'string' && isValidHexColor(b.secondaryColor))) &&
    (b.accentColor === undefined ||
      (typeof b.accentColor === 'string' && isValidHexColor(b.accentColor))) &&
    (b.footerText === undefined ||
      (typeof b.footerText === 'string' && b.footerText.length <= 500)) &&
    b.versionTimestamp instanceof Date
  );
}
