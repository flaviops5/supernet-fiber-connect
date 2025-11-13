import { createPublicHandler } from "../_shared/base-handler.ts";

interface StressTestConfig {
  duration_seconds: number;
  concurrent_users: number;
  endpoints: string[];
  ramp_up_seconds?: number;
}

interface StressTestResult {
  endpoint: string;
  total_requests: number;
  successful: number;
  failed: number;
  avg_response_time_ms: number;
  min_response_time_ms: number;
  max_response_time_ms: number;
  errors: Array<{ count: number; message: string }>;
}

Deno.serve(createPublicHandler(
  'ixc-stress-test',
  async (req, { supabase }) => {
    const config: StressTestConfig = await req.json();
    
    console.log('🔥 Iniciando stress test IXC', {
      duration: config.duration_seconds,
      users: config.concurrent_users,
      endpoints: config.endpoints
    });

    const IXC_API_KEY = Deno.env.get('IXC_API_KEY');
    const IXC_BASE_URL = Deno.env.get('IXC_BASE_URL');

    if (!IXC_API_KEY || !IXC_BASE_URL) {
      throw new Error('IXC credentials not configured');
    }

    const results: StressTestResult[] = [];
    const startTime = Date.now();
    const endTime = startTime + (config.duration_seconds * 1000);
    const rampUpTime = config.ramp_up_seconds || 5;
    const usersPerSecond = config.concurrent_users / rampUpTime;

    // Função para fazer requisições a um endpoint específico
    const stressEndpoint = async (endpoint: string): Promise<StressTestResult> => {
      const responseTimes: number[] = [];
      const errors = new Map<string, number>();
      let successful = 0;
      let failed = 0;

      const makeRequest = async () => {
        const reqStart = Date.now();
        try {
          const response = await fetch(`${IXC_BASE_URL}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${IXC_API_KEY}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000) // 10s timeout
          });

          const reqTime = Date.now() - reqStart;
          responseTimes.push(reqTime);

          if (response.ok) {
            successful++;
          } else {
            failed++;
            const errorMsg = `HTTP ${response.status}`;
            errors.set(errorMsg, (errors.get(errorMsg) || 0) + 1);
          }
        } catch (error) {
          const reqTime = Date.now() - reqStart;
          responseTimes.push(reqTime);
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.set(errorMsg, (errors.get(errorMsg) || 0) + 1);
        }
      };

      // Ramp-up: adicionar usuários gradualmente
      const activeUsers: Promise<void>[] = [];
      let currentUsers = 0;
      
      const rampInterval = setInterval(() => {
        if (currentUsers < config.concurrent_users) {
          currentUsers++;
          // Cada usuário faz requisições continuamente até o fim do teste
          const userLoop = async () => {
            while (Date.now() < endTime) {
              await makeRequest();
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1 req/seg por usuário
            }
          };
          activeUsers.push(userLoop());
        }
      }, (rampUpTime * 1000) / config.concurrent_users);

      // Aguardar fim do teste
      await new Promise(resolve => setTimeout(resolve, config.duration_seconds * 1000));
      clearInterval(rampInterval);

      // Aguardar todos os usuários finalizarem
      await Promise.all(activeUsers);

      // Calcular estatísticas
      const avgTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;
      const minTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
      const maxTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

      return {
        endpoint,
        total_requests: successful + failed,
        successful,
        failed,
        avg_response_time_ms: Math.round(avgTime),
        min_response_time_ms: minTime,
        max_response_time_ms: maxTime,
        errors: Array.from(errors.entries()).map(([message, count]) => ({ message, count }))
      };
    };

    // Executar stress test em todos os endpoints em paralelo
    const testPromises = config.endpoints.map(endpoint => stressEndpoint(endpoint));
    results.push(...await Promise.all(testPromises));

    const totalDuration = Date.now() - startTime;
    const totalRequests = results.reduce((sum, r) => sum + r.total_requests, 0);
    const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const successRate = totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0;
    const requestsPerSecond = (totalRequests / (totalDuration / 1000)).toFixed(2);

    // Registrar no banco
    await supabase.from('monitoring_logs').insert({
      action: 'ixc_stress_test_completed',
      details: {
        config,
        results,
        summary: {
          total_duration_ms: totalDuration,
          total_requests: totalRequests,
          successful: totalSuccessful,
          failed: totalFailed,
          success_rate_percent: Math.round(successRate),
          requests_per_second: requestsPerSecond
        }
      }
    });

    console.log('✅ Stress test IXC concluído', {
      duration_ms: totalDuration,
      total_requests: totalRequests,
      success_rate: `${Math.round(successRate)}%`,
      rps: requestsPerSecond
    });

    return {
      success: true,
      summary: {
        total_duration_ms: totalDuration,
        total_requests: totalRequests,
        successful: totalSuccessful,
        failed: totalFailed,
        success_rate_percent: Math.round(successRate),
        requests_per_second: requestsPerSecond
      },
      results
    };
  }
));
