import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '@/utils/logger';

describe('Logger Utility', () => {
  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('deve logar mensagens info', () => {
    logger.info('Test info message');
    expect(console.log).toHaveBeenCalled();
  });

  it('deve logar mensagens de erro', () => {
    logger.error('Test error message', new Error('Test error'));
    expect(console.error).toHaveBeenCalled();
  });

  it('deve logar mensagens de warning', () => {
    logger.warn('Test warning message');
    expect(console.warn).toHaveBeenCalled();
  });

  it('deve aceitar contexto adicional', () => {
    logger.info('Test with context', { userId: '123', action: 'test' });
    expect(console.log).toHaveBeenCalled();
  });

  it('deve formatar erros corretamente', () => {
    const error = new Error('Test error');
    logger.error('Error occurred', error);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error occurred'),
      expect.anything()
    );
  });
});
