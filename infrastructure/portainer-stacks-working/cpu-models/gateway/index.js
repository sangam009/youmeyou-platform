#!/usr/bin/env node
/**
 * CPU Models Gateway Service
 * Routes requests to DistilBERT for classification tasks
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Service URLs - Only DistilBERT
const SERVICES = {
    'distilbert': process.env.DISTILBERT_URL || 'http://distilbert-service-prod:8002'
};

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: Object.keys(SERVICES),
        version: '3.0.0'
    });
});

// Service status endpoint
app.get('/services', async (req, res) => {
    const serviceStatus = {};
    
    for (const [serviceName, serviceUrl] of Object.entries(SERVICES)) {
        try {
            const response = await axios.get(`${serviceUrl}/health`, { timeout: 5000 });
            serviceStatus[serviceName] = {
                status: 'healthy',
                url: serviceUrl,
                response: response.data
            };
        } catch (error) {
            serviceStatus[serviceName] = {
                status: 'unhealthy',
                url: serviceUrl,
                error: error.message
            };
        }
    }
    
    res.json({
        gateway_status: 'healthy',
        services: serviceStatus,
        timestamp: new Date().toISOString()
    });
});

// Route all requests to DistilBERT
app.post('/route', async (req, res) => {
    try {
        const serviceUrl = `${SERVICES['distilbert']}/generate`;
        console.log(`Routing to DistilBERT for classification`);
        
        const response = await axios.post(serviceUrl, req.body, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        res.json({
            ...response.data,
            routed_to: 'distilbert',
            routing_reason: 'classification'
        });
        
    } catch (error) {
        console.error('Routing error:', error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.error || error.message,
            routing_failed: true
        });
    }
});

// Direct route to DistilBERT
app.post('/cpu-models/:model/:endpoint', async (req, res) => {
    const { model, endpoint } = req.params;
    
    try {
        if (model !== 'distilbert') {
            return res.status(404).json({
                success: false,
                error: `Only DistilBERT model is available`,
                available_models: ['distilbert']
            });
        }

        const serviceUrl = `${SERVICES[model]}/${endpoint}`;
        console.log(`Direct routing to DistilBERT: ${endpoint}`);
        
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

// Fallback route
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        available_endpoints: [
            'GET /health',
            'GET /services', 
            'POST /route',
            'POST /cpu-models/distilbert/:endpoint'
        ],
        available_models: ['distilbert']
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CPU Models Gateway running on port ${PORT}`);
    console.log(`📡 Available services: ${Object.keys(SERVICES).join(', ')}`);
    console.log(`🔗 Service URLs:`, SERVICES);
}); 