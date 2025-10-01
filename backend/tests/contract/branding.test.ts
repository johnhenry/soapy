import { describe, it, expect } from 'vitest';
import { validateBranding, type Branding } from '../../src/models/branding.js';

describe('Branding Validation Schema Tests', () => {
  it('should validate valid branding with all required fields', () => {
    const branding: Branding = {
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#FF5733',
      versionTimestamp: new Date(),
    };

    expect(validateBranding(branding)).toBe(true);
  });

  it('should validate branding with optional fields', () => {
    const branding: Branding = {
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#FF5733',
      secondaryColor: '#123456',
      accentColor: '#ABCDEF',
      footerText: 'Copyright 2024',
      versionTimestamp: new Date(),
    };

    expect(validateBranding(branding)).toBe(true);
  });

  it('should reject logoUrl with non-HTTPS protocol', () => {
    const branding = {
      logoUrl: 'http://example.com/logo.png',
      primaryColor: '#FF5733',
      versionTimestamp: new Date(),
    };

    expect(validateBranding(branding)).toBe(false);
  });

  it('should reject invalid hex color format', () => {
    const branding = {
      logoUrl: 'https://example.com/logo.png',
      primaryColor: 'red',
      versionTimestamp: new Date(),
    };

    expect(validateBranding(branding)).toBe(false);
  });

  it('should reject hex colors without # prefix', () => {
    const branding = {
      logoUrl: 'https://example.com/logo.png',
      primaryColor: 'FF5733',
      versionTimestamp: new Date(),
    };

    expect(validateBranding(branding)).toBe(false);
  });

  it('should reject footerText longer than 500 characters', () => {
    const branding = {
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#FF5733',
      footerText: 'x'.repeat(501),
      versionTimestamp: new Date(),
    };

    expect(validateBranding(branding)).toBe(false);
  });

  it('should accept footerText exactly 500 characters', () => {
    const branding: Branding = {
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#FF5733',
      footerText: 'x'.repeat(500),
      versionTimestamp: new Date(),
    };

    expect(validateBranding(branding)).toBe(true);
  });

  it('should reject branding without required logoUrl', () => {
    const branding = {
      primaryColor: '#FF5733',
      versionTimestamp: new Date(),
    };

    expect(validateBranding(branding)).toBe(false);
  });

  it('should reject branding without required primaryColor', () => {
    const branding = {
      logoUrl: 'https://example.com/logo.png',
      versionTimestamp: new Date(),
    };

    expect(validateBranding(branding)).toBe(false);
  });

  it('should reject branding without versionTimestamp', () => {
    const branding = {
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#FF5733',
    };

    expect(validateBranding(branding)).toBe(false);
  });
});
