import logger from './logger.js';

/**
 * API Monitor - Tracks all LLM and CPU model calls with detailed statistics
 * Helps identify quota issues and optimize API usage
 */
class APIMonitor {
  constructor() {
    this.stats = {
      llm: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        quotaExceededCalls: 0,
        callsPerMinute: 0,
        lastResetTime: Date.now(),
        recentCalls: [],
        models: {}
      },
      cpu: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        fallbackCalls: 0,
        callsPerMinute: 0,
        lastResetTime: Date.now(),
        recentCalls: [],
        endpoints: {}
      }
    };
    
    // Reset counters every minute
    setInterval(() => {
      this.resetMinuteCounters();
    }, 60000);
    
    logger.info('📊 [API MONITOR] API Monitor initialized');
  }

  /**
   * Track LLM API call
   */
  trackLLMCall(callData) {
    const now = Date.now();
    const call = {
      timestamp: now,
      requestId: callData.requestId || `llm-${now}`,
      model: callData.model,
      promptLength: callData.promptLength,
      success: callData.success,
      error: callData.error,
      responseTime: callData.responseTime,
      quotaExceeded: callData.error && callData.error.includes('429')
    };

    // Update stats
    this.stats.llm.totalCalls++;
    this.stats.llm.callsPerMinute++;
    
    if (call.success) {
      this.stats.llm.successfulCalls++;
    } else {
      this.stats.llm.failedCalls++;
      if (call.quotaExceeded) {
        this.stats.llm.quotaExceededCalls++;
      }
    }

    // Track per-model stats
    if (!this.stats.llm.models[call.model]) {
      this.stats.llm.models[call.model] = {
        calls: 0,
        successful: 0,
        failed: 0,
        quotaExceeded: 0
      };
    }
    
    this.stats.llm.models[call.model].calls++;
    if (call.success) {
      this.stats.llm.models[call.model].successful++;
    } else {
      this.stats.llm.models[call.model].failed++;
      if (call.quotaExceeded) {
        this.stats.llm.models[call.model].quotaExceeded++;
      }
    }

    // Keep recent calls for debugging
    this.stats.llm.recentCalls.push(call);
    if (this.stats.llm.recentCalls.length > 50) {
      this.stats.llm.recentCalls.shift();
    }

    // Log detailed call info
    logger.info('📊 [API MONITOR] LLM Call Tracked:', {
      requestId: call.requestId,
      model: call.model,
      promptLength: call.promptLength,
      success: call.success,
      responseTime: call.responseTime,
      quotaExceeded: call.quotaExceeded,
      totalCalls: this.stats.llm.totalCalls,
      callsThisMinute: this.stats.llm.callsPerMinute,
      successRate: `${((this.stats.llm.successfulCalls / this.stats.llm.totalCalls) * 100).toFixed(1)}%`,
      quotaExceededRate: `${((this.stats.llm.quotaExceededCalls / this.stats.llm.totalCalls) * 100).toFixed(1)}%`
    });

    // Log warning if quota exceeded
    if (call.quotaExceeded) {
      logger.warn('⚠️ [API MONITOR] LLM QUOTA EXCEEDED:', {
        requestId: call.requestId,
        model: call.model,
        totalQuotaExceeded: this.stats.llm.quotaExceededCalls,
        quotaExceededRate: `${((this.stats.llm.quotaExceededCalls / this.stats.llm.totalCalls) * 100).toFixed(1)}%`
      });
    }
  }

  /**
   * Track CPU model API call
   */
  trackCPUCall(callData) {
    const now = Date.now();
    const call = {
      timestamp: now,
      requestId: callData.requestId || `cpu-${now}`,
      endpoint: callData.endpoint,
      requestType: callData.requestType,
      success: callData.success,
      error: callData.error,
      responseTime: callData.responseTime,
      fallback: callData.fallback
    };

    // Update stats
    this.stats.cpu.totalCalls++;
    this.stats.cpu.callsPerMinute++;
    
    if (call.success) {
      this.stats.cpu.successfulCalls++;
    } else {
      this.stats.cpu.failedCalls++;
      if (call.fallback) {
        this.stats.cpu.fallbackCalls++;
      }
    }

    // Track per-endpoint stats
    if (!this.stats.cpu.endpoints[call.endpoint]) {
      this.stats.cpu.endpoints[call.endpoint] = {
        calls: 0,
        successful: 0,
        failed: 0,
        fallbacks: 0
      };
    }
    
    this.stats.cpu.endpoints[call.endpoint].calls++;
    if (call.success) {
      this.stats.cpu.endpoints[call.endpoint].successful++;
    } else {
      this.stats.cpu.endpoints[call.endpoint].failed++;
      if (call.fallback) {
        this.stats.cpu.endpoints[call.endpoint].fallbacks++;
      }
    }

    // Keep recent calls for debugging
    this.stats.cpu.recentCalls.push(call);
    if (this.stats.cpu.recentCalls.length > 50) {
      this.stats.cpu.recentCalls.shift();
    }

    // Log detailed call info
    logger.info('📊 [API MONITOR] CPU Call Tracked:', {
      requestId: call.requestId,
      endpoint: call.endpoint,
      requestType: call.requestType,
      success: call.success,
      responseTime: call.responseTime,
      fallback: call.fallback,
      totalCalls: this.stats.cpu.totalCalls,
      callsThisMinute: this.stats.cpu.callsPerMinute,
      successRate: `${((this.stats.cpu.successfulCalls / this.stats.cpu.totalCalls) * 100).toFixed(1)}%`,
      fallbackRate: `${((this.stats.cpu.fallbackCalls / this.stats.cpu.totalCalls) * 100).toFixed(1)}%`
    });

    // Log warning if CPU models are being bypassed frequently
    if (call.fallback && this.stats.cpu.fallbackCalls > 5) {
      logger.warn('⚠️ [API MONITOR] HIGH CPU FALLBACK RATE:', {
        fallbackCalls: this.stats.cpu.fallbackCalls,
        totalCalls: this.stats.cpu.totalCalls,
        fallbackRate: `${((this.stats.cpu.fallbackCalls / this.stats.cpu.totalCalls) * 100).toFixed(1)}%`
      });
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    return {
      timestamp: new Date().toISOString(),
      llm: {
        ...this.stats.llm,
        successRate: this.stats.llm.totalCalls > 0 ? 
          ((this.stats.llm.successfulCalls / this.stats.llm.totalCalls) * 100).toFixed(1) + '%' : '0%',
        quotaExceededRate: this.stats.llm.totalCalls > 0 ? 
          ((this.stats.llm.quotaExceededCalls / this.stats.llm.totalCalls) * 100).toFixed(1) + '%' : '0%'
      },
      cpu: {
        ...this.stats.cpu,
        successRate: this.stats.cpu.totalCalls > 0 ? 
          ((this.stats.cpu.successfulCalls / this.stats.cpu.totalCalls) * 100).toFixed(1) + '%' : '0%',
        fallbackRate: this.stats.cpu.totalCalls > 0 ? 
          ((this.stats.cpu.fallbackCalls / this.stats.cpu.totalCalls) * 100).toFixed(1) + '%' : '0%'
      }
    };
  }

  /**
   * Log comprehensive statistics
   */
  logStats() {
    const stats = this.getStats();
    
    logger.info('📊 [API MONITOR] === API USAGE STATISTICS ===');
    logger.info('📊 [API MONITOR] LLM Stats:', {
      totalCalls: stats.llm.totalCalls,
      successfulCalls: stats.llm.successfulCalls,
      failedCalls: stats.llm.failedCalls,
      quotaExceededCalls: stats.llm.quotaExceededCalls,
      callsThisMinute: stats.llm.callsPerMinute,
      successRate: stats.llm.successRate,
      quotaExceededRate: stats.llm.quotaExceededRate,
      models: stats.llm.models
    });
    
    logger.info('📊 [API MONITOR] CPU Stats:', {
      totalCalls: stats.cpu.totalCalls,
      successfulCalls: stats.cpu.successfulCalls,
      failedCalls: stats.cpu.failedCalls,
      fallbackCalls: stats.cpu.fallbackCalls,
      callsThisMinute: stats.cpu.callsPerMinute,
      successRate: stats.cpu.successRate,
      fallbackRate: stats.cpu.fallbackRate,
      endpoints: stats.cpu.endpoints
    });
    
    logger.info('📊 [API MONITOR] ================================');
  }

  /**
   * Reset minute counters
   */
  resetMinuteCounters() {
    this.stats.llm.callsPerMinute = 0;
    this.stats.llm.lastResetTime = Date.now();
    this.stats.cpu.callsPerMinute = 0;
    this.stats.cpu.lastResetTime = Date.now();
    
    // Log stats every minute
    this.logStats();
  }

  /**
   * Check if we're approaching quota limits
   */
  checkQuotaStatus() {
    const quotaWarningThreshold = 0.8; // 80% of quota
    const llmQuotaRate = this.stats.llm.quotaExceededCalls / Math.max(this.stats.llm.totalCalls, 1);
    
    if (llmQuotaRate > quotaWarningThreshold) {
      logger.warn('🚨 [API MONITOR] QUOTA WARNING: High quota exceeded rate detected:', {
        quotaExceededRate: `${(llmQuotaRate * 100).toFixed(1)}%`,
        totalCalls: this.stats.llm.totalCalls,
        quotaExceededCalls: this.stats.llm.quotaExceededCalls
      });
      return false;
    }
    
    return true;
  }

  /**
   * Get recent failed calls for debugging
   */
  getRecentFailures() {
    const llmFailures = this.stats.llm.recentCalls
      .filter(call => !call.success)
      .slice(-10);
    
    const cpuFailures = this.stats.cpu.recentCalls
      .filter(call => !call.success)
      .slice(-10);
    
    return {
      llmFailures,
      cpuFailures,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const apiMonitor = new APIMonitor();
export default apiMonitor; 