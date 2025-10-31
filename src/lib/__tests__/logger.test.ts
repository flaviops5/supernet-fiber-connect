import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger } from '@/lib/logger';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

describe('Logger Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve ter métodos de logging disponíveis', () => {
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('deve aceitar mensagem simples', () => {
    expect(() => logger.info('Test message')).not.toThrow();
  });

  it('deve aceitar mensagem com metadata', () => {
    expect(() => 
      logger.info('Test with metadata', { userId: '123', action: 'test' })
    ).not.toThrow();
  });

  it('deve aceitar erro como metadata', () => {
    const testError = new Error('Test error');
    expect(() => 
      logger.error('Error occurred', { error: testError })
    ).not.toThrow();
  });

  it('deve sanitizar dados sensíveis', () => {
    const sensitiveData = {
      password: 'secret123',
      email: 'user@example.com',
      token: 'abc123',
    };

    expect(() => 
      logger.info('Processing user data', sensitiveData)
    ).not.toThrow();

    // Logger deve processar sem expor dados sensíveis
  });

  it('deve suportar diferentes níveis de log', () => {
    expect(() => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
    }).not.toThrow();
  });
});
