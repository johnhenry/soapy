import { useState, useEffect } from 'react';
import type { Branding } from '../types';
import './BrandingEditor.css';

interface BrandingEditorProps {
  conversationId: string;
  branding?: Branding;
  onSave: (branding: Branding) => void;
}

export function BrandingEditor({ branding, onSave }: BrandingEditorProps) {
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [footerText, setFooterText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branding) {
      setLogoUrl(branding.logoUrl);
      setPrimaryColor(branding.primaryColor);
      setSecondaryColor(branding.secondaryColor || '#10b981');
      setAccentColor(branding.accentColor || '#f59e0b');
      setFooterText(branding.footerText || '');
    }
  }, [branding]);

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const validateHexColor = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  };

  const handleSave = () => {
    setError(null);

    if (!validateUrl(logoUrl)) {
      setError('Logo URL must be a valid HTTPS URL');
      return;
    }

    if (!validateHexColor(primaryColor)) {
      setError('Primary color must be a valid hex color (e.g., #3b82f6)');
      return;
    }

    if (secondaryColor && !validateHexColor(secondaryColor)) {
      setError('Secondary color must be a valid hex color');
      return;
    }

    if (accentColor && !validateHexColor(accentColor)) {
      setError('Accent color must be a valid hex color');
      return;
    }

    const newBranding: Branding = {
      logoUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      footerText: footerText || undefined,
      versionTimestamp: new Date().toISOString(),
    };

    onSave(newBranding);
  };

  return (
    <div className="branding-editor">
      <h3>Branding Configuration</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="branding-form">
        <div className="form-group">
          <label>Logo URL (HTTPS only)</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          {logoUrl && validateUrl(logoUrl) && (
            <div className="logo-preview">
              <img src={logoUrl} alt="Logo preview" />
            </div>
          )}
        </div>

        <div className="color-group">
          <div className="form-group">
            <label>Primary Color</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Secondary Color</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#10b981"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Accent Color</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#f59e0b"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Footer Text (optional)</label>
          <textarea
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="Powered by Soapy"
            rows={3}
          />
        </div>

        <div className="preview-section">
          <h4>Preview</h4>
          <div className="branding-preview" style={{
            borderColor: primaryColor,
            backgroundColor: `${primaryColor}10`
          }}>
            {logoUrl && validateUrl(logoUrl) && (
              <img src={logoUrl} alt="Preview" className="preview-logo" />
            )}
            <div className="preview-colors">
              <div className="preview-color" style={{ background: primaryColor }} title="Primary" />
              <div className="preview-color" style={{ background: secondaryColor }} title="Secondary" />
              <div className="preview-color" style={{ background: accentColor }} title="Accent" />
            </div>
            {footerText && <div className="preview-footer">{footerText}</div>}
          </div>
        </div>

        <button onClick={handleSave}>Save Branding</button>
      </div>
    </div>
  );
}
