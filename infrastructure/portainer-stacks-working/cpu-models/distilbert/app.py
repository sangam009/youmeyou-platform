#!/usr/bin/env python3
"""
DistilBERT Classification Service
Simple Flask API for text classification using DistilBERT
"""

import os
import logging
from flask import Flask, request, jsonify
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global variables
model_loaded = True  # Start with simple rule-based classification

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model_loaded,
        'model_name': os.getenv('MODEL_NAME', 'distilbert-base-uncased'),
        'timestamp': time.time()
    })

@app.route('/classify', methods=['POST'])
def classify():
    """Classify text complexity and type"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Text is required'
            }), 400
        
        text = data['text']
        logger.info(f"Classifying text: {text[:50]}...")
        
        start_time = time.time()
        
        # Simple rule-based complexity analysis
        complexity_score = analyze_complexity(text)
        task_type = classify_task_type(text)
        
        classification_time = time.time() - start_time
        
        logger.info(f"Classified text in {classification_time:.2f}s")
        
        return jsonify({
            'success': True,
            'data': {
                'complexity_score': complexity_score,
                'complexity_level': get_complexity_level(complexity_score),
                'task_type': task_type,
                'recommended_model': recommend_model(complexity_score, task_type),
                'classification_time': classification_time,
                'text_length': len(text)
            }
        })
        
    except Exception as e:
        logger.error(f"Error classifying text: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def analyze_complexity(text):
    """Analyze text complexity (0.0 to 1.0)"""
    factors = []
    
    # Length factor
    length_factor = min(len(text) / 1000, 1.0)
    factors.append(length_factor * 0.3)
    
    # Technical terms
    technical_terms = ['architecture', 'microservice', 'database', 'api', 'deployment', 
                      'kubernetes', 'docker', 'authentication', 'authorization']
    tech_count = sum(1 for term in technical_terms if term.lower() in text.lower())
    tech_factor = min(tech_count / 5, 1.0)
    factors.append(tech_factor * 0.4)
    
    # Complexity keywords
    complex_keywords = ['complex', 'advanced', 'enterprise', 'scalable', 'distributed']
    complex_count = sum(1 for keyword in complex_keywords if keyword.lower() in text.lower())
    complex_factor = min(complex_count / 3, 1.0)
    factors.append(complex_factor * 0.3)
    
    return sum(factors)

def classify_task_type(text):
    """Classify the type of task"""
    text_lower = text.lower()
    
    if any(word in text_lower for word in ['generate', 'create', 'build', 'develop']):
        return 'generation'
    elif any(word in text_lower for word in ['analyze', 'review', 'check', 'validate']):
        return 'analysis'
    elif any(word in text_lower for word in ['design', 'architecture', 'structure']):
        return 'design'
    elif any(word in text_lower for word in ['code', 'programming', 'function', 'class']):
        return 'coding'
    else:
        return 'general'

def get_complexity_level(score):
    """Convert complexity score to level"""
    if score < 0.3:
        return 'simple'
    elif score < 0.6:
        return 'medium'
    else:
        return 'complex'

def recommend_model(complexity_score, task_type):
    """Recommend which model to use"""
    if complexity_score < 0.3:
        if task_type == 'coding':
            return 'template'
        else:
            return 'flan-t5'
    elif complexity_score < 0.6:
        if task_type == 'coding':
            return 'codebert'
        else:
            return 'flan-t5'
    else:
        return 'llm-fallback'

@app.route('/info', methods=['GET'])
def info():
    """Model information endpoint"""
    return jsonify({
        'model_name': os.getenv('MODEL_NAME', 'distilbert-base-uncased'),
        'model_loaded': model_loaded,
        'capabilities': ['text-classification', 'complexity-analysis', 'task-routing'],
        'max_length': int(os.getenv('MAX_LENGTH', 512)),
        'device': 'cpu'
    })

if __name__ == '__main__':
    # Start Flask app
    port = int(os.getenv('PORT', 8002))
    app.run(host='0.0.0.0', port=port, debug=False) 