#!/usr/bin/env python3
"""
FLAN-T5 Small Model Service
Simple Flask API for text generation using FLAN-T5
"""

import os
import logging
from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, AutoModelForCausalLM
import torch
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global variables for model and tokenizer
model = None
tokenizer = None
model_loaded = False

# Model configuration
MODEL_NAME = "mistralai/Mistral-7B-v0.1"  # Using Mistral 7B instead of FLAN-T5
CACHE_DIR = "/app/models"

def load_model():
    """Load FLAN-T5 model and tokenizer"""
    global model, tokenizer, model_loaded
    
    try:
        logger.info(f"Loading model: {MODEL_NAME}")
        
        # Set environment variables for better caching
        os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
        os.environ['TRANSFORMERS_CACHE'] = CACHE_DIR
        
        # HuggingFace token for gated models
        hf_token = os.getenv('HF_TOKEN')
        if not hf_token:
            logger.error("HF_TOKEN environment variable is required for gated models")
            model_loaded = False
            return
        
        # Try both 'token' and 'use_auth_token' for compatibility
        try:
            tokenizer = AutoTokenizer.from_pretrained(
                MODEL_NAME,
                cache_dir=CACHE_DIR,
                token=hf_token
            )
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                cache_dir=CACHE_DIR,
                torch_dtype=torch.float16,
                device_map="auto",
                token=hf_token
            )
        except TypeError:
            tokenizer = AutoTokenizer.from_pretrained(
                MODEL_NAME,
                cache_dir=CACHE_DIR,
                use_auth_token=hf_token
            )
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                cache_dir=CACHE_DIR,
                torch_dtype=torch.float16,
                device_map="auto",
                use_auth_token=hf_token
            )
        
        # Set pad token if not exists
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        model_loaded = True
        logger.info("Mistral model loaded successfully!")
        
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        model_loaded = False

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy' if model_loaded else 'loading',
        'model_loaded': model_loaded,
        'model_name': MODEL_NAME,
        'timestamp': time.time()
    })

@app.route('/generate', methods=['POST'])
def generate():
    """Generate text using FLAN-T5"""
    if not model_loaded:
        return jsonify({
            'success': False,
            'error': 'Model not loaded yet'
        }), 503
    
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({
                'success': False,
                'error': 'Prompt is required'
            }), 400
        
        prompt = data['prompt']
        max_length = data.get('max_length', 512)
        
        logger.info(f"Generating text for prompt: {prompt[:50]}...")
        
        # Tokenize input
        inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
        
        # Generate
        start_time = time.time()
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                max_length=max_length,
                num_beams=2,
                early_stopping=True,
                pad_token_id=tokenizer.pad_token_id
            )
        
        # Decode output
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        generation_time = time.time() - start_time
        
        logger.info(f"Generated text in {generation_time:.2f}s")
        
        return jsonify({
            'success': True,
            'data': {
                'generated_text': generated_text,
                'prompt': prompt,
                'generation_time': generation_time,
                'model': MODEL_NAME
            }
        })
        
    except Exception as e:
        logger.error(f"Error generating text: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/info', methods=['GET'])
def info():
    """Model information endpoint"""
    return jsonify({
        'model_name': MODEL_NAME,
        'model_loaded': model_loaded,
        'capabilities': ['text-generation', 'question-answering', 'summarization'],
        'max_length': int(os.getenv('MAX_LENGTH', 512)),
        'device': 'cpu'
    })

if __name__ == '__main__':
    # Load model on startup
    load_model()
    
    # Start Flask app
    port = int(os.getenv('PORT', 8001))
    app.run(host='0.0.0.0', port=port, debug=False) 