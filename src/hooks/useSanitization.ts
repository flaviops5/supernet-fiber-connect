import { useMemo } from 'react';
import DOMPurify from 'dompurify';

export const useSanitization = () => {
  const sanitizeInput = useMemo(() => (input: string): string => {
    if (typeof input !== 'string') return '';
    
    // Remove scripts maliciosos usando DOMPurify
    let clean = DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [], // Remove todas as tags HTML
      ALLOWED_ATTR: [],  // Remove todos os atributos
      KEEP_CONTENT: true // Mantém o conteúdo texto
    });
    
    // Remove caracteres de controle
    clean = clean.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Remove scripts maliciosos adicionais
    clean = clean.replace(/javascript:/gi, '');
    clean = clean.replace(/on\w+\s*=/gi, '');
    
    // Normaliza espaços
    clean = clean.replace(/\s+/g, ' ').trim();
    
    // Remove caracteres potencialmente perigosos para SQL
    clean = clean.replace(/[';--]/g, '');
    
    return clean;
  }, []);

  const sanitizeEmail = useMemo(() => (email: string): string => {
    if (typeof email !== 'string') return '';
    
    // Sanitização básica e normalização
    let clean = email.toLowerCase().trim();
    
    // Remove caracteres não permitidos em emails
    clean = clean.replace(/[^a-z0-9@._+-]/g, '');
    
    return clean;
  }, []);

  const sanitizePhone = useMemo(() => (phone: string): string => {
    if (typeof phone !== 'string') return '';
    
    // Remove tudo exceto números, espaços, parênteses, hífens e +
    let clean = phone.replace(/[^0-9\s\-\(\)\+]/g, '');
    
    // Normaliza espaços
    clean = clean.replace(/\s+/g, ' ').trim();
    
    return clean;
  }, []);

  const sanitizeName = useMemo(() => (name: string): string => {
    if (typeof name !== 'string') return '';
    
    // Remove números e caracteres especiais, mantém apenas letras, espaços e acentos
    let clean = name.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    
    // Normaliza espaços
    clean = clean.replace(/\s+/g, ' ').trim();
    
    // Capitaliza primeira letra de cada palavra
    clean = clean.replace(/\b\w/g, l => l.toUpperCase());
    
    return clean;
  }, []);

  const detectSuspiciousContent = useMemo(() => (input: string): boolean => {
    if (typeof input !== 'string') return false;
    
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
      /exec\s*\(/i,
      /xp_cmdshell/i,
      /base64/i,
      /eval\s*\(/i,
      /\bselect\b.*\bfrom\b/i,
      /\b(or|and)\s+\d+\s*=\s*\d+/i,
      /['";]\s*(or|and|union)/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(input));
  }, []);

  return {
    sanitizeInput,
    sanitizeEmail,
    sanitizePhone,
    sanitizeName,
    detectSuspiciousContent
  };
};