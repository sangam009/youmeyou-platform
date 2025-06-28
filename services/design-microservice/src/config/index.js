export const config = {
  a2a: {
    apiKey: process.env.A2A_API_KEY,
    baseUrl: process.env.A2A_BASE_URL || 'http://localhost:3000'
  },
  api: {
    geminiEndpoint: process.env.GEMINI_ENDPOINT || 'http://localhost:8000/gemini',
    distilbertEndpoint: process.env.DISTILBERT_ENDPOINT || 'http://localhost:8000/distilbert',
    flanT5Endpoint: process.env.FLAN_T5_ENDPOINT || 'http://localhost:8000/flan-t5',
    codebertEndpoint: process.env.CODEBERT_ENDPOINT || 'http://localhost:8000/codebert'
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/design-service'
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'design_service'
  }
}; 