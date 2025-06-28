import os
import logging
import requests
import json
import subprocess
import time
from flask import Flask, request, jsonify

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global variables
ollama_ready = False
model_name = "mistral:7b"

def check_ollama_service():
    """Check if Ollama service is running"""
    try:
        response = requests.get("http://localhost:11434/api/version", timeout=5)
        return response.status_code == 200
    except:
        return False

def start_ollama_service():
    """Start Ollama service"""
    try:
        logger.info("Starting Ollama service...")
        # Start Ollama in background
        subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Wait for service to start
        for i in range(30):  # Wait up to 30 seconds
            if check_ollama_service():
                logger.info("Ollama service started successfully")
                return True
            time.sleep(1)
        
        logger.error("Ollama service failed to start")
        return False
    except Exception as e:
        logger.error(f"Error starting Ollama service: {e}")
        return False

def pull_model():
    """Pull the Mistral model using Ollama"""
    try:
        logger.info(f"Pulling model {model_name}...")
        
        # Use Ollama API to pull model
        response = requests.post(
            "http://localhost:11434/api/pull",
            json={"name": model_name},
            stream=True,
            timeout=1800  # 30 minutes timeout for model download
        )
        
        if response.status_code == 200:
            # Stream the download progress
            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        if "status" in data:
                            logger.info(f"Model pull status: {data['status']}")
                        if data.get("status") == "success":
                            logger.info(f"Model {model_name} pulled successfully")
                            return True
                    except json.JSONDecodeError:
                        continue
        
        logger.error(f"Failed to pull model {model_name}")
        return False
        
    except Exception as e:
        logger.error(f"Error pulling model: {e}")
        return False

def initialize_ollama():
    """Initialize Ollama service and pull model"""
    global ollama_ready
    
    try:
        # Check if Ollama is already running
        if not check_ollama_service():
            if not start_ollama_service():
                return False
        
        # Pull the model
        if pull_model():
            ollama_ready = True
            logger.info("Ollama initialization completed successfully")
            return True
        else:
            logger.error("Failed to pull model")
            return False
            
    except Exception as e:
        logger.error(f"Error initializing Ollama: {e}")
        return False

def generate_with_ollama(prompt, max_tokens=100, temperature=0.7):
    """Generate text using Ollama API"""
    try:
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature
            }
        }
        
        response = requests.post(
            "http://localhost:11434/api/generate",
            json=payload,
            timeout=120  # 2 minutes timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get("response", "")
        else:
            logger.error(f"Ollama API error: {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"Error generating with Ollama: {e}")
        return None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    ollama_status = check_ollama_service()
    return jsonify({
        'status': 'healthy' if ollama_ready and ollama_status else 'loading',
        'ollama_ready': ollama_ready,
        'ollama_service': ollama_status,
        'model_name': model_name,
        'timestamp': time.time()
    })

@app.route('/generate', methods=['POST'])
def generate():
    """Generate text endpoint"""
    if not ollama_ready:
        return jsonify({
            'success': False,
            'error': 'Ollama service not ready yet'
        }), 503
    
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({
                'success': False,
                'error': 'Prompt is required'
            }), 400
        
        prompt = data['prompt']
        max_tokens = data.get('max_length', 100)
        temperature = data.get('temperature', 0.7)
        
        # Generate response using Ollama
        response = generate_with_ollama(prompt, max_tokens, temperature)
        
        if response is None:
            return jsonify({
                'success': False,
                'error': 'Failed to generate response'
            }), 500
        
        return jsonify({
            'success': True,
            'response': response,
            'prompt': prompt,
            'model': model_name
        })
        
    except Exception as e:
        logger.error(f"Error in generate endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get model information"""
    return jsonify({
        'model_name': model_name,
        'ollama_ready': ollama_ready,
        'ollama_service': check_ollama_service(),
        'backend': 'ollama'
    })

@app.route('/models', methods=['GET'])
def list_models():
    """List available models in Ollama"""
    try:
        if not check_ollama_service():
            return jsonify({'error': 'Ollama service not available'}), 503
            
        response = requests.get("http://localhost:11434/api/tags")
        if response.status_code == 200:
            return response.json()
        else:
            return jsonify({'error': 'Failed to fetch models'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Mistral 7B service with Ollama...")
    
    # Initialize Ollama in background (non-blocking)
    import threading
    init_thread = threading.Thread(target=initialize_ollama)
    init_thread.daemon = True
    init_thread.start()
    
    # Start Flask app
    app.run(host='0.0.0.0', port=8001, debug=False) 