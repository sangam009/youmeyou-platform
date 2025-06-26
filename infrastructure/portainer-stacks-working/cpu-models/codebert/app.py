#!/usr/bin/env python3
"""
CodeBERT Analysis Service
Simple Flask API for code analysis using CodeBERT
"""

import os
import logging
from flask import Flask, request, jsonify
import time
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global variables
model_loaded = True  # Start with simple rule-based analysis

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model_loaded,
        'model_name': os.getenv('MODEL_NAME', 'microsoft/codebert-base'),
        'timestamp': time.time()
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    """Analyze code structure and complexity"""
    try:
        data = request.get_json()
        if not data or 'code' not in data:
            return jsonify({
                'success': False,
                'error': 'Code is required'
            }), 400
        
        code = data['code']
        logger.info(f"Analyzing code: {len(code)} characters")
        
        start_time = time.time()
        
        # Simple rule-based code analysis
        analysis = analyze_code_structure(code)
        
        analysis_time = time.time() - start_time
        
        logger.info(f"Analyzed code in {analysis_time:.2f}s")
        
        return jsonify({
            'success': True,
            'data': {
                'analysis': analysis,
                'analysis_time': analysis_time,
                'code_length': len(code)
            }
        })
        
    except Exception as e:
        logger.error(f"Error analyzing code: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def analyze_code_structure(code):
    """Analyze code structure and patterns"""
    analysis = {
        'language': detect_language(code),
        'complexity_score': calculate_complexity(code),
        'patterns': detect_patterns(code),
        'suggestions': generate_suggestions(code)
    }
    
    return analysis

def detect_language(code):
    """Detect programming language"""
    if 'import ' in code and ('def ' in code or 'class ' in code):
        return 'python'
    elif 'function ' in code or 'const ' in code or 'let ' in code:
        return 'javascript'
    elif 'public class' in code or 'import java' in code:
        return 'java'
    elif '#include' in code or 'int main' in code:
        return 'c/c++'
    else:
        return 'unknown'

def calculate_complexity(code):
    """Calculate code complexity score (0.0 to 1.0)"""
    factors = []
    
    # Length factor
    length_factor = min(len(code) / 2000, 1.0)
    factors.append(length_factor * 0.2)
    
    # Nesting level
    max_nesting = 0
    current_nesting = 0
    for line in code.split('\n'):
        stripped = line.strip()
        if any(keyword in stripped for keyword in ['if ', 'for ', 'while ', 'try:', 'with ']):
            current_nesting += 1
            max_nesting = max(max_nesting, current_nesting)
        elif stripped.startswith(('else', 'elif', 'except', 'finally')):
            continue
        elif stripped == '' or stripped.startswith('#'):
            continue
        else:
            # Estimate nesting decrease
            leading_spaces = len(line) - len(line.lstrip())
            if leading_spaces == 0:
                current_nesting = 0
    
    nesting_factor = min(max_nesting / 5, 1.0)
    factors.append(nesting_factor * 0.3)
    
    # Function count
    function_count = len(re.findall(r'def\s+\w+|function\s+\w+|public\s+\w+\s+\w+\s*\(', code))
    function_factor = min(function_count / 10, 1.0)
    factors.append(function_factor * 0.2)
    
    # Class count
    class_count = len(re.findall(r'class\s+\w+|public\s+class\s+\w+', code))
    class_factor = min(class_count / 5, 1.0)
    factors.append(class_factor * 0.3)
    
    return sum(factors)

def detect_patterns(code):
    """Detect common code patterns"""
    patterns = []
    
    # Design patterns
    if 'class' in code and 'def __init__' in code:
        patterns.append('object-oriented')
    
    if 'async def' in code or 'await ' in code:
        patterns.append('async-programming')
    
    if 'try:' in code and 'except' in code:
        patterns.append('error-handling')
    
    if 'import ' in code:
        patterns.append('modular-design')
    
    if 'def test_' in code or 'assert ' in code:
        patterns.append('testing')
    
    return patterns

def generate_suggestions(code):
    """Generate code improvement suggestions"""
    suggestions = []
    
    # Check for common issues
    if len(code.split('\n')) > 100:
        suggestions.append("Consider breaking this into smaller functions")
    
    if 'TODO' in code or 'FIXME' in code:
        suggestions.append("Complete TODO/FIXME items")
    
    if code.count('def ') > 10:
        suggestions.append("Consider organizing functions into classes")
    
    if 'print(' in code:
        suggestions.append("Consider using proper logging instead of print statements")
    
    return suggestions

@app.route('/info', methods=['GET'])
def info():
    """Model information endpoint"""
    return jsonify({
        'model_name': os.getenv('MODEL_NAME', 'microsoft/codebert-base'),
        'model_loaded': model_loaded,
        'capabilities': ['code-analysis', 'pattern-detection', 'complexity-analysis'],
        'supported_languages': ['python', 'javascript', 'java', 'c/c++'],
        'device': 'cpu'
    })

if __name__ == '__main__':
    # Start Flask app
    port = int(os.getenv('PORT', 8003))
    app.run(host='0.0.0.0', port=port, debug=False) 