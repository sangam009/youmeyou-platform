export const config = {
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  a2a: {
    apiKey: process.env.A2A_API_KEY,
    baseUrl: process.env.A2A_BASE_URL || 'http://localhost:4000'
  },
  authService: {
    url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001'
  },
  api: {
    geminiEndpoint: process.env.GEMINI_ENDPOINT || 'http://localhost:8000/gemini',
    distilbertEndpoint: process.env.DISTILBERT_ENDPOINT || 'http://localhost:8000/distilbert',
    flanT5Endpoint: process.env.FLAN_T5_ENDPOINT || 'http://localhost:8000/flan-t5',
    codebertEndpoint: process.env.CODEBERT_ENDPOINT || 'http://localhost:8000/codebert'
  },
  googleAI: {
    apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY
  },
  cors: {
    origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001']
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://design_admin:design_mongo_2024!@localhost:27017/design_service?authSource=admin'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || 'design_redis_2024!'
  }
}; 