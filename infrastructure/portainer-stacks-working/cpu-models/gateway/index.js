#!/usr/bin/env node
/**
 * CPU Models Gateway Service
 * Routes requests between CPU models and provides unified API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Service URLs
const SERVICES = {
    'flan-t5': process.env.FLAN_T5_URL || 'http://flan-t5-service-prod:8001',
    'distilbert': process.env.DISTILBERT_URL || 'http://distilbert-service-prod:8002',
    'codebert': process.env.CODEBERT_URL || 'http://codebert-service-prod:8003'
};

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const healthChecks = await Promise.allSettled([
            checkServiceHealth('flan-t5'),
            checkServiceHealth('distilbert'),
            checkServiceHealth('codebert')
        ]);

        const services = {};
        healthChecks.forEach((result, index) => {
            const serviceName = Object.keys(SERVICES)[index];
            services[serviceName] = {
                status: result.status === 'fulfilled' ? 'healthy' : 'unhealthy',
                error: result.status === 'rejected' ? result.reason.message : null
            };
        });

        const allHealthy = Object.values(services).every(s => s.status === 'healthy');

        res.json({
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            services,
            gateway: {
                status: 'healthy',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: '1.0.0'
            }
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Route to specific CPU model
app.post('/cpu-models/:model/:endpoint', async (req, res) => {
    const { model, endpoint } = req.params;
    
    try {
        if (!SERVICES[model]) {
            return res.status(404).json({
                success: false,
                error: `Model '${model}' not found. Available models: ${Object.keys(SERVICES).join(', ')}`
            });
        }

        const serviceUrl = `${SERVICES[model]}/${endpoint}`;
        console.log(`Routing request to: ${serviceUrl}`);

        const response = await axios.post(serviceUrl, req.body, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error(`Error routing to ${model}/${endpoint}:`, error.message);
        
        if (error.code === 'ECONNREFUSED') {
            res.status(503).json({
                success: false,
                error: `Service '${model}' is unavailable`,
                details: 'Connection refused'
            });
        } else if (error.code === 'ETIMEDOUT') {
            res.status(504).json({
                success: false,
                error: `Service '${model}' timed out`,
                details: 'Request timeout'
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.response?.data?.error || error.message,
                details: error.response?.data || null
            });
        }
    }
});

// Intelligent routing endpoint
app.post('/route', async (req, res) => {
    try {
        const { text, code, task_type } = req.body;
        
        if (!text && !code) {
            return res.status(400).json({
                success: false,
                error: 'Either text or code is required'
            });
        }

        // First, classify the request
        let classification;
        if (text) {
            classification = await classifyText(text);
        } else if (code) {
            classification = await analyzeCode(code);
        }

        // Route based on classification
        const routedResponse = await routeBasedOnClassification(classification, req.body);
        
        res.json({
            success: true,
            data: routedResponse,
            classification,
            routing_decision: {
                selected_model: classification.recommended_model,
                reason: getRoutingReason(classification)
            }
        });

    } catch (error) {
        console.error('Routing error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get service information
app.get('/services', async (req, res) => {
    try {
        const serviceInfo = await Promise.allSettled([
            getServiceInfo('flan-t5'),
            getServiceInfo('distilbert'),
            getServiceInfo('codebert')
        ]);

        const services = {};
        serviceInfo.forEach((result, index) => {
            const serviceName = Object.keys(SERVICES)[index];
            services[serviceName] = result.status === 'fulfilled' 
                ? result.value 
                : { error: result.reason.message };
        });

        res.json({
            success: true,
            services,
            gateway_info: {
                version: '1.0.0',
                available_models: Object.keys(SERVICES),
                endpoints: ['/health', '/cpu-models/:model/:endpoint', '/route', '/services']
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper functions
async function checkServiceHealth(serviceName) {
    const response = await axios.get(`${SERVICES[serviceName]}/health`, { timeout: 5000 });
    return response.data;
}

async function getServiceInfo(serviceName) {
    const response = await axios.get(`${SERVICES[serviceName]}/info`, { timeout: 5000 });
    return response.data;
}

async function classifyText(text) {
    try {
        const response = await axios.post(`${SERVICES['distilbert']}/classify`, { text }, { timeout: 10000 });
        return response.data.data;
    } catch (error) {
        console.error('Classification error:', error.message);
        // Fallback classification
        return {
            complexity_score: 0.5,
            complexity_level: 'medium',
            task_type: 'general',
            recommended_model: 'flan-t5'
        };
    }
}

async function analyzeCode(code) {
    try {
        const response = await axios.post(`${SERVICES['codebert']}/analyze`, { code }, { timeout: 10000 });
        const analysis = response.data.data.analysis;
        
        return {
            complexity_score: analysis.complexity_score,
            complexity_level: analysis.complexity_score > 0.6 ? 'complex' : 'medium',
            task_type: 'coding',
            recommended_model: analysis.complexity_score > 0.6 ? 'llm-fallback' : 'codebert',
            language: analysis.language
        };
    } catch (error) {
        console.error('Code analysis error:', error.message);
        return {
            complexity_score: 0.5,
            complexity_level: 'medium',
            task_type: 'coding',
            recommended_model: 'codebert'
        };
    }
}

async function routeBasedOnClassification(classification, requestData) {
    const { recommended_model } = classification;
    
    if (recommended_model === 'template') {
        return {
            type: 'template',
            response: 'This is a template response for simple requests',
            processing_time: 0.001
        };
    }
    
    if (recommended_model === 'llm-fallback') {
        return {
            type: 'llm-fallback',
            response: 'This request requires LLM processing (not implemented in CPU models)',
            processing_time: 0.001,
            suggestion: 'Route to Gemini or similar LLM service'
        };
    }
    
    // Route to appropriate CPU model
    if (recommended_model === 'flan-t5' && requestData.text) {
        const response = await axios.post(`${SERVICES['flan-t5']}/generate`, {
            prompt: requestData.text,
            max_length: requestData.max_length || 512
        }, { timeout: 30000 });
        return response.data.data;
    }
    
    if (recommended_model === 'codebert' && requestData.code) {
        const response = await axios.post(`${SERVICES['codebert']}/analyze`, {
            code: requestData.code
        }, { timeout: 30000 });
        return response.data.data;
    }
    
    // Default fallback
    return {
        type: 'fallback',
        response: 'Unable to process request with available CPU models',
        processing_time: 0.001
    };
}

function getRoutingReason(classification) {
    const { complexity_level, task_type, recommended_model } = classification;
    
    if (recommended_model === 'template') {
        return `Simple ${task_type} task routed to template response`;
    }
    
    if (recommended_model === 'llm-fallback') {
        return `Complex ${task_type} task requires LLM processing`;
    }
    
    return `${complexity_level} complexity ${task_type} task routed to ${recommended_model}`;
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        available_endpoints: ['/health', '/cpu-models/:model/:endpoint', '/route', '/services']
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`CPU Models Gateway running on port ${PORT}`);
    console.log(`Available services: ${Object.keys(SERVICES).join(', ')}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
}); 