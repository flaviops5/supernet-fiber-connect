import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Supabase Connection', () => {
  beforeAll(() => {
    // Configuração inicial se necessário
  });

  it('deve estar configurado corretamente', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
    expect(supabase.from).toBeDefined();
  });

  it('deve ter métodos de auth disponíveis', () => {
    expect(supabase.auth.signInWithPassword).toBeDefined();
    expect(supabase.auth.signOut).toBeDefined();
    expect(supabase.auth.getSession).toBeDefined();
  });

  it('deve ter métodos de database disponíveis', () => {
    const query = supabase.from('conversations');
    expect(query).toBeDefined();
    expect(typeof query.select).toBe('function');
    expect(typeof query.insert).toBe('function');
    expect(typeof query.update).toBe('function');
    expect(typeof query.delete).toBe('function');
  });

  it('deve conseguir criar queries', () => {
    const query = supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    expect(query).toBeDefined();
  });

  it('deve ter configuração de realtime', () => {
    const channel = supabase.channel('test-channel');
    expect(channel).toBeDefined();
  });
});
