const config = {
  api: {
    // Gemini API endpoints
    geminiEndpoint: process.env.GEMINI_API_ENDPOINT || 'http://localhost:8080/gemini',
    
    // CPU Model endpoints
    flanT5Endpoint: process.env.FLAN_T5_ENDPOINT || 'http://localhost:8081/flan-t5',
    codebertEndpoint: process.env.CODEBERT_ENDPOINT || 'http://localhost:8082/codebert',
    distilbertEndpoint: process.env.DISTILBERT_ENDPOINT || 'http://localhost:8083/distilbert',
    
    // Default timeouts
    requestTimeout: parseInt(process.env.API_REQUEST_TIMEOUT, 10) || 30000,
    streamTimeout: parseInt(process.env.API_STREAM_TIMEOUT, 10) || 60000
  },

  // Model-specific configurations
  models: {
    gemini: {
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.95,
      topK: 40
    },
    flanT5: {
      temperature: 0.3,
      maxTokens: 512,
      topP: 0.9,
      topK: 50
    },
    codebert: {
      temperature: 0.1,
      maxTokens: 256,
      topP: 0.8,
      topK: 30
    },
    distilbert: {
      temperature: 0.1,
      maxTokens: 128,
      topP: 0.8,
      topK: 20
    }
  },

  // Task-specific model assignments
  tasks: {
    codeGeneration: 'gemini',
    architectureDesign: 'gemini',
    documentation: 'flanT5',
    codeAnalysis: 'codebert',
    classification: 'distilbert',
    summarization: 'flanT5',
    patternDetection: 'codebert'
  },

  // Cache configuration
  cache: {
    enabled: process.env.ENABLE_CACHE === 'true',
    ttl: parseInt(process.env.CACHE_TTL, 10) || 3600, // 1 hour
    maxSize: parseInt(process.env.CACHE_MAX_SIZE, 10) || 1000 // entries
  },

  // Monitoring and logging
  monitoring: {
    enabled: process.env.ENABLE_MONITORING === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT, 10) || 9090
  }
};

module.exports = { config }; 