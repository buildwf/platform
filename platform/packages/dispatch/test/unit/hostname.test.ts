import { describe, it, expect } from 'vite-plus/test';
import { extractSlug } from '../../src/hostname.ts';

describe('extractSlug', () => {
  it('extracts slug from valid hostname', () => {
    expect(extractSlug('my-app.buildwf.dev')).toBe('my-app');
  });

  it('extracts single-word slug', () => {
    expect(extractSlug('hello.buildwf.dev')).toBe('hello');
  });

  it('extracts slug with numbers', () => {
    expect(extractSlug('app123.buildwf.dev')).toBe('app123');
  });

  it('extracts single-char slug', () => {
    expect(extractSlug('x.buildwf.dev')).toBe('x');
  });

  it('returns null for bare domain', () => {
    expect(extractSlug('buildwf.dev')).toBeNull();
  });

  it('returns null for nested subdomain', () => {
    expect(extractSlug('foo.bar.buildwf.dev')).toBeNull();
  });

  it('returns null for unrelated domain', () => {
    expect(extractSlug('example.com')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractSlug('')).toBeNull();
  });

  it('returns null for slug with leading dash', () => {
    expect(extractSlug('-bad.buildwf.dev')).toBeNull();
  });

  it('returns null for slug with trailing dash', () => {
    expect(extractSlug('bad-.buildwf.dev')).toBeNull();
  });

  it('returns null for slug with uppercase', () => {
    expect(extractSlug('MyApp.buildwf.dev')).toBeNull();
  });

  it('returns null for slug with underscores', () => {
    expect(extractSlug('my_app.buildwf.dev')).toBeNull();
  });

  describe('custom baseHostname', () => {
    it('extracts slug from staging hostname', () => {
      expect(extractSlug('my-app.staging.buildwf.dev', 'staging.buildwf.dev')).toBe('my-app');
    });

    it('returns null for production hostname when expecting staging', () => {
      expect(extractSlug('my-app.buildwf.dev', 'staging.buildwf.dev')).toBeNull();
    });

    it('returns null for staging hostname when expecting production', () => {
      expect(extractSlug('my-app.staging.buildwf.dev', 'buildwf.dev')).toBeNull();
    });

    it('returns null for bare staging domain', () => {
      expect(extractSlug('staging.buildwf.dev', 'staging.buildwf.dev')).toBeNull();
    });

    it('rejects nested subdomains on staging', () => {
      expect(extractSlug('foo.bar.staging.buildwf.dev', 'staging.buildwf.dev')).toBeNull();
    });
  });
});
