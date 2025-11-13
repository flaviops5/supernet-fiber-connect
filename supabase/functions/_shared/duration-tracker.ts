/**
 * ⏱️ Duration Tracking Utilities
 * 
 * High-precision timing utilities for performance monitoring.
 * Tracks operation duration in milliseconds with microsecond precision.
 */

/**
 * Duration tracker instance
 */
export class DurationTracker {
  private startTime: number;
  private endTime: number | null = null;
  private checkpoints: Map<string, number> = new Map();

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Record a checkpoint with a name
   */
  checkpoint(name: string): void {
    this.checkpoints.set(name, performance.now());
  }

  /**
   * Get duration since start in milliseconds
   */
  get elapsed(): number {
    const end = this.endTime ?? performance.now();
    return Math.round((end - this.startTime) * 100) / 100; // 2 decimal precision
  }

  /**
   * Get duration between two checkpoints
   */
  between(start: string, end: string): number | null {
    const startTime = this.checkpoints.get(start);
    const endTime = this.checkpoints.get(end);
    
    if (!startTime || !endTime) return null;
    
    return Math.round((endTime - startTime) * 100) / 100;
  }

  /**
   * Mark operation as complete and return final duration
   */
  complete(): number {
    this.endTime = performance.now();
    return this.elapsed;
  }

  /**
   * Get all checkpoint durations relative to start
   */
  getAllCheckpoints(): Record<string, number> {
    const result: Record<string, number> = {};
    
    for (const [name, time] of this.checkpoints.entries()) {
      result[name] = Math.round((time - this.startTime) * 100) / 100;
    }
    
    return result;
  }

  /**
   * Reset tracker for reuse
   */
  reset(): void {
    this.startTime = performance.now();
    this.endTime = null;
    this.checkpoints.clear();
  }
}

/**
 * Create a new duration tracker
 * 
 * @example
 * ```ts
 * const timer = createTimer();
 * await doWork();
 * const duration = timer.complete();
 * console.log(`Operation took ${duration}ms`);
 * ```
 */
export function createTimer(): DurationTracker {
  return new DurationTracker();
}

/**
 * Measure async function execution time
 * 
 * @example
 * ```ts
 * const [result, duration] = await measure(async () => {
 *   return await fetchData();
 * });
 * console.log(`Fetch took ${duration}ms`);
 * ```
 */
export async function measure<T>(
  fn: () => Promise<T>
): Promise<[T, number]> {
  const timer = createTimer();
  const result = await fn();
  const duration = timer.complete();
  return [result, duration];
}

/**
 * Measure synchronous function execution time
 * 
 * @example
 * ```ts
 * const [result, duration] = measureSync(() => {
 *   return processData(data);
 * });
 * ```
 */
export function measureSync<T>(
  fn: () => T
): [T, number] {
  const timer = createTimer();
  const result = fn();
  const duration = timer.complete();
  return [result, duration];
}

/**
 * Create a scoped timer with automatic logging
 * 
 * @example
 * ```ts
 * const scope = createScope('database-query');
 * await db.query(...);
 * const duration = scope.end(); // Auto-logs duration
 * ```
 */
export function createScope(
  name: string,
  logger?: (message: string, duration: number) => void
): {
  checkpoint: (label: string) => void;
  end: () => number;
} {
  const timer = createTimer();
  
  return {
    checkpoint: (label: string) => {
      timer.checkpoint(label);
    },
    end: () => {
      const duration = timer.complete();
      if (logger) {
        logger(name, duration);
      }
      return duration;
    },
  };
}

/**
 * Performance budget checker
 * Warns if operation exceeds threshold
 * 
 * @example
 * ```ts
 * const budget = createBudget('api-call', 1000); // 1000ms limit
 * await fetch(...);
 * budget.check(); // Warns if > 1000ms
 * ```
 */
export function createBudget(
  operation: string,
  budgetMs: number
): {
  check: () => { exceeded: boolean; duration: number; budgetMs: number };
} {
  const timer = createTimer();
  
  return {
    check: () => {
      const duration = timer.complete();
      const exceeded = duration > budgetMs;
      
      if (exceeded) {
        console.warn(
          `⚠️ Performance budget exceeded: ${operation} took ${duration}ms (budget: ${budgetMs}ms)`
        );
      }
      
      return { exceeded, duration, budgetMs };
    },
  };
}

/**
 * Format duration for human-readable output
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${Math.round(ms * 1000)}μs`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000 * 10) / 10}s`;
  return `${Math.round(ms / 60000 * 10) / 10}m`;
}
