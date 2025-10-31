import { describe, it, expect } from 'vitest';
import { 
  sanitizeHTML, 
  sanitizeEmailHTML, 
  sanitizeContractHTML,
  stripHTML,
  containsDangerousHTML 
} from '@/lib/sanitize';

describe('Sanitize Utility - XSS Protection', () => {
  describe('sanitizeHTML', () => {
    it('deve remover scripts maliciosos', () => {
      const dirty = '<p>Hello</p><script>alert("XSS")</script>';
      const clean = sanitizeHTML(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('Hello');
    });

    it('deve remover event handlers', () => {
      const dirty = '<img src="x" onerror="alert(1)">';
      const clean = sanitizeHTML(dirty);
      expect(clean).not.toContain('onerror');
    });

    it('deve remover javascript: URLs', () => {
      const dirty = '<a href="javascript:alert(1)">Click</a>';
      const clean = sanitizeHTML(dirty);
      expect(clean).not.toContain('javascript:');
    });

    it('deve permitir HTML seguro', () => {
      const safe = '<p><strong>Bold</strong> and <em>italic</em></p>';
      const clean = sanitizeHTML(safe);
      expect(clean).toContain('<strong>');
      expect(clean).toContain('<em>');
    });
  });

  describe('sanitizeEmailHTML', () => {
    it('deve permitir estilos inline seguros', () => {
      const html = '<div style="color: blue; font-size: 14px;">Email content</div>';
      const clean = sanitizeEmailHTML(html);
      expect(clean).toContain('style=');
      expect(clean).toContain('color');
    });

    it('deve remover estilos maliciosos', () => {
      const dirty = '<div style="background: url(javascript:alert(1))">Text</div>';
      const clean = sanitizeEmailHTML(dirty);
      expect(clean).not.toContain('javascript:');
    });
  });

  describe('sanitizeContractHTML', () => {
    it('deve manter estrutura de documento', () => {
      const contract = '<h1>Contract Title</h1><p>Clause 1</p><ul><li>Item</li></ul>';
      const clean = sanitizeContractHTML(contract);
      expect(clean).toContain('<h1>');
      expect(clean).toContain('<ul>');
      expect(clean).toContain('<li>');
    });

    it('deve remover conteúdo perigoso', () => {
      const dirty = '<h1>Title</h1><iframe src="evil.com"></iframe>';
      const clean = sanitizeContractHTML(dirty);
      expect(clean).not.toContain('<iframe>');
      expect(clean).toContain('Title');
    });
  });

  describe('stripHTML', () => {
    it('deve remover todas as tags HTML', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const text = stripHTML(html);
      expect(text).toBe('Hello World');
      expect(text).not.toContain('<');
    });

    it('deve decodificar entidades HTML', () => {
      const html = '&lt;div&gt;Test&lt;/div&gt;';
      const text = stripHTML(html);
      expect(text).toBe('<div>Test</div>');
    });
  });

  describe('containsDangerousHTML', () => {
    it('deve detectar script tags', () => {
      expect(containsDangerousHTML('<script>alert(1)</script>')).toBe(true);
    });

    it('deve detectar event handlers', () => {
      expect(containsDangerousHTML('<img onerror="alert(1)">')).toBe(true);
    });

    it('deve detectar javascript: URLs', () => {
      expect(containsDangerousHTML('<a href="javascript:void(0)">Link</a>')).toBe(true);
    });

    it('deve aprovar HTML seguro', () => {
      expect(containsDangerousHTML('<p>Safe <strong>text</strong></p>')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('deve lidar com string vazia', () => {
      expect(sanitizeHTML('')).toBe('');
      expect(stripHTML('')).toBe('');
    });

    it('deve lidar com null/undefined', () => {
      expect(() => sanitizeHTML(null as any)).not.toThrow();
      expect(() => stripHTML(undefined as any)).not.toThrow();
    });

    it('deve lidar com caracteres especiais', () => {
      const special = '<p>Price: $100 & €50</p>';
      const clean = sanitizeHTML(special);
      expect(clean).toContain('$100');
      expect(clean).toContain('€50');
    });
  });
});
