// utils/healthMonitor.js
class HealthMonitor {
  constructor() {
    this.cronMisses = 0;
    this.lastExecution = Date.now();
    this.executionTimes = [];
  }
  
  recordExecution(startTime) {
    const executionTime = Date.now() - startTime;
    this.executionTimes.push(executionTime);
    
    // Keep only last 10 execution times
    if (this.executionTimes.length > 10) {
      this.executionTimes.shift();
    }
    
    this.lastExecution = Date.now();
    this.cronMisses = 0;
    
    const avgTime = this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length;
    
    if (avgTime > 60000) { // If average execution time > 60 seconds
      console.warn(`🚨 Cron jobs taking too long (avg: ${avgTime}ms). Consider optimizing.`);
    }
  }
  
  recordMiss() {
    this.cronMisses++;
    
    if (this.cronMisses > 3) {
      console.error('🚨 Multiple cron misses detected! System may be overloaded.');
      // Here you could send an alert or scale your infrastructure
    }
  }
  
  getStats() {
    return {
      lastExecution: this.lastExecution,
      cronMisses: this.cronMisses,
      avgExecutionTime: this.executionTimes.length ? 
        this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length : 0,
      totalExecutions: this.executionTimes.length
    };
  }
}

module.exports = new HealthMonitor();