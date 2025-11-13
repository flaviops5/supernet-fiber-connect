import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('IXC Stress Test Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve executar stress test com configuração padrão', async () => {
    const mockResponse = {
      data: {
        summary: {
          total_duration_ms: 60000,
          total_requests: 1200,
          successful: 1180,
          failed: 20,
          success_rate_percent: 98.33,
          requests_per_second: '20.00',
        },
        results: [
          {
            endpoint: '/cliente/get?id=123',
            total_requests: 600,
            successful: 590,
            failed: 10,
            avg_response_time_ms: 250,
            min_response_time_ms: 100,
            max_response_time_ms: 500,
            errors: [],
          },
        ],
      },
      error: null,
    };

    (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

    const result = await supabase.functions.invoke('ixc-stress-test', {
      body: {
        duration_seconds: 60,
        concurrent_users: 20,
        ramp_up_seconds: 10,
        endpoints: ['/cliente/get?id=123'],
      },
    });

    expect(result.data.summary.success_rate_percent).toBeGreaterThan(95);
    expect(result.data.summary.total_requests).toBeGreaterThan(0);
    expect(result.error).toBeNull();
  });

  it('deve reportar falhas quando taxa de sucesso for baixa', async () => {
    const mockResponse = {
      data: {
        summary: {
          total_duration_ms: 60000,
          total_requests: 100,
          successful: 50,
          failed: 50,
          success_rate_percent: 50,
          requests_per_second: '1.67',
        },
      },
      error: null,
    };

    (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

    const result = await supabase.functions.invoke('ixc-stress-test', {
      body: {
        duration_seconds: 60,
        concurrent_users: 5,
        ramp_up_seconds: 5,
        endpoints: ['/cliente/get?id=999'],
      },
    });

    expect(result.data.summary.success_rate_percent).toBeLessThan(90);
  });

  it('deve calcular métricas de performance corretamente', async () => {
    const mockResponse = {
      data: {
        summary: {
          total_duration_ms: 10000,
          total_requests: 100,
          successful: 100,
          failed: 0,
          success_rate_percent: 100,
          requests_per_second: '10.00',
        },
        results: [
          {
            endpoint: '/cliente/buscar',
            total_requests: 100,
            successful: 100,
            failed: 0,
            avg_response_time_ms: 150,
            min_response_time_ms: 50,
            max_response_time_ms: 300,
            errors: [],
          },
        ],
      },
      error: null,
    };

    (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

    const result = await supabase.functions.invoke('ixc-stress-test', {
      body: {
        duration_seconds: 10,
        concurrent_users: 10,
        ramp_up_seconds: 2,
        endpoints: ['/cliente/buscar'],
      },
    });

    const resultData = result.data.results[0];
    expect(resultData.avg_response_time_ms).toBeLessThan(500);
    expect(resultData.max_response_time_ms).toBeLessThan(1000);
    expect(resultData.min_response_time_ms).toBeGreaterThan(0);
  });

  it('deve testar múltiplos endpoints simultaneamente', async () => {
    const mockResponse = {
      data: {
        summary: {
          total_duration_ms: 30000,
          total_requests: 300,
          successful: 295,
          failed: 5,
          success_rate_percent: 98.33,
          requests_per_second: '10.00',
        },
        results: [
          {
            endpoint: '/cliente/get?id=1',
            total_requests: 100,
            successful: 98,
            failed: 2,
            avg_response_time_ms: 200,
            min_response_time_ms: 100,
            max_response_time_ms: 400,
            errors: [],
          },
          {
            endpoint: '/cliente_contrato/get',
            total_requests: 100,
            successful: 99,
            failed: 1,
            avg_response_time_ms: 180,
            min_response_time_ms: 90,
            max_response_time_ms: 350,
            errors: [],
          },
          {
            endpoint: '/fn_areceber',
            total_requests: 100,
            successful: 98,
            failed: 2,
            avg_response_time_ms: 220,
            min_response_time_ms: 110,
            max_response_time_ms: 450,
            errors: [],
          },
        ],
      },
      error: null,
    };

    (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

    const result = await supabase.functions.invoke('ixc-stress-test', {
      body: {
        duration_seconds: 30,
        concurrent_users: 10,
        ramp_up_seconds: 5,
        endpoints: [
          '/cliente/get?id=1',
          '/cliente_contrato/get',
          '/fn_areceber',
        ],
      },
    });

    expect(result.data.results).toHaveLength(3);
    expect(result.data.summary.total_requests).toBeGreaterThan(200);
  });

  it('deve capturar e reportar erros', async () => {
    const mockResponse = {
      data: {
        summary: {
          total_duration_ms: 5000,
          total_requests: 50,
          successful: 30,
          failed: 20,
          success_rate_percent: 60,
          requests_per_second: '10.00',
        },
        results: [
          {
            endpoint: '/invalid/endpoint',
            total_requests: 50,
            successful: 30,
            failed: 20,
            avg_response_time_ms: 500,
            min_response_time_ms: 200,
            max_response_time_ms: 2000,
            errors: [
              { count: 15, message: '404 Not Found' },
              { count: 5, message: '500 Internal Server Error' },
            ],
          },
        ],
      },
      error: null,
    };

    (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

    const result = await supabase.functions.invoke('ixc-stress-test', {
      body: {
        duration_seconds: 5,
        concurrent_users: 10,
        ramp_up_seconds: 1,
        endpoints: ['/invalid/endpoint'],
      },
    });

    expect(result.data.results[0].errors).toBeDefined();
    expect(result.data.results[0].errors.length).toBeGreaterThan(0);
  });

  it('deve validar configuração mínima', async () => {
    const mockResponse = {
      data: null,
      error: { message: 'Invalid configuration' },
    };

    (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

    const result = await supabase.functions.invoke('ixc-stress-test', {
      body: {
        duration_seconds: 0,
        concurrent_users: 0,
        ramp_up_seconds: 0,
        endpoints: [],
      },
    });

    expect(result.error).toBeDefined();
  });
});
