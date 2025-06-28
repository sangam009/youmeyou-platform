#!/usr/bin/env python3
"""
FLAN-T5 Small Model Service
Fast text generation for canvas merging and step planning
Target: 400-500ms response time per iteration
"""

import os
import logging
import time
from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global variables for model and tokenizer
model = None
tokenizer = None
model_loaded = False

# Model configuration - Using FLAN-T5 Small as per architecture
MODEL_NAME = "google/flan-t5-small"  # 308MB model for fast inference
CACHE_DIR = "/app/models"
MAX_LENGTH = int(os.getenv('MAX_LENGTH', 256))  # Shorter for faster response

def load_model():
    """Load FLAN-T5 Small model and tokenizer with proper compatibility"""
    global model, tokenizer, model_loaded
    
    try:
        logger.info(f"Loading FLAN-T5 Small model: {MODEL_NAME}")
        
        # Set environment variables for better caching
        os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
        os.environ['TRANSFORMERS_CACHE'] = CACHE_DIR
        
        # Load tokenizer and model with proper compatibility
        # FLAN-T5 uses T5Tokenizer which is compatible with AutoTokenizer
        tokenizer = AutoTokenizer.from_pretrained(
            MODEL_NAME,
            cache_dir=CACHE_DIR,
            trust_remote_code=True
        )
        
        # Load FLAN-T5 model for sequence-to-sequence tasks
        # Remove device_map and low_cpu_mem_usage to avoid accelerate dependency
        model = AutoModelForSeq2SeqLM.from_pretrained(
            MODEL_NAME,
            cache_dir=CACHE_DIR,
            torch_dtype=torch.float32  # Use float32 for better CPU performance
        )
        
        # Move model to CPU explicitly
        model = model.to('cpu')
        
        # Ensure tokenizer compatibility
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        # Optimize model for inference
        model.eval()
        
        model_loaded = True
        logger.info("FLAN-T5 Small model loaded successfully!")
        logger.info(f"Model parameters: {model.num_parameters():,}")
        
    except Exception as e:
        logger.error(f"Error loading FLAN-T5 model: {e}")
        model_loaded = False

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy' if model_loaded else 'loading',
        'model_loaded': model_loaded,
        'model_name': MODEL_NAME,
        'model_size': '308MB',
        'target_latency': '400-500ms',
        'timestamp': time.time()
    })

@app.route('/generate', methods=['POST'])
def generate():
    """Generate text using FLAN-T5 Small - optimized for canvas merging"""
    if not model_loaded:
        return jsonify({
            'success': False,
            'error': 'FLAN-T5 model not loaded yet'
        }), 503
    
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({
                'success': False,
                'error': 'Prompt is required'
            }), 400
        
        prompt = data['prompt']
        max_length = min(data.get('max_length', MAX_LENGTH), 512)  # Cap at 512 for speed
        
        logger.info(f"Generating text for prompt: {prompt[:50]}...")
        
        start_time = time.time()
        
        # Tokenize input with proper truncation
        inputs = tokenizer(
            prompt, 
            return_tensors="pt", 
            max_length=256,  # Input limit for speed
            truncation=True,
            padding=True
        )
        
        # Generate with optimized settings for speed
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                attention_mask=inputs.attention_mask,
                max_length=max_length,
                min_length=10,
                num_beams=2,  # Reduced beams for speed
                early_stopping=True,
                do_sample=False,  # Greedy decoding for speed
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id
            )
        
        # Decode output
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        generation_time = time.time() - start_time
        
        logger.info(f"Generated text in {generation_time:.3f}s")
        
        return jsonify({
            'success': True,
            'data': {
                'generated_text': generated_text,
                'prompt': prompt,
                'generation_time': round(generation_time, 3),
                'model': MODEL_NAME,
                'performance_target': '400-500ms',
                'actual_performance': f"{generation_time*1000:.0f}ms"
            }
        })
        
    except Exception as e:
        logger.error(f"Error generating text: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/merge', methods=['POST'])
def merge_canvas():
    """Specialized endpoint for canvas merging operations"""
    if not model_loaded:
        return jsonify({
            'success': False,
            'error': 'FLAN-T5 model not loaded yet'
        }), 503
    
    try:
        data = request.get_json()
        if not data or 'canvas_data' not in data:
            return jsonify({
                'success': False,
                'error': 'canvas_data is required'
            }), 400
        
        canvas_data = data['canvas_data']
        merge_instruction = data.get('instruction', 'Merge and optimize the following canvas elements:')
        
        # Create optimized prompt for canvas merging
        prompt = f"{merge_instruction}\n\nCanvas Data:\n{canvas_data}\n\nMerged Result:"
        
        logger.info("Processing canvas merge request...")
        
        start_time = time.time()
        
        # Tokenize with canvas-optimized settings
        inputs = tokenizer(
            prompt, 
            return_tensors="pt", 
            max_length=200,  # Shorter for canvas operations
            truncation=True,
            padding=True
        )
        
        # Generate with canvas-optimized settings
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                attention_mask=inputs.attention_mask,
                max_length=150,  # Shorter output for canvas merging
                num_beams=1,     # Fastest generation
                do_sample=False,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id
            )
        
        # Decode output
        merged_result = tokenizer.decode(outputs[0], skip_special_tokens=True)
        generation_time = time.time() - start_time
        
        logger.info(f"Canvas merge completed in {generation_time:.3f}s")
        
        return jsonify({
            'success': True,
            'data': {
                'merged_canvas': merged_result,
                'original_canvas': canvas_data,
                'merge_time': round(generation_time, 3),
                'model': MODEL_NAME,
                'operation': 'canvas_merge'
            }
        })
        
    except Exception as e:
        logger.error(f"Error merging canvas: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/plan', methods=['POST'])
def generate_steps():
    """Generate step-by-step plans using FLAN-T5"""
    if not model_loaded:
        return jsonify({
            'success': False,
            'error': 'FLAN-T5 model not loaded yet'
        }), 503
    
    try:
        data = request.get_json()
        if not data or 'task' not in data:
            return jsonify({
                'success': False,
                'error': 'task is required'
            }), 400
        
        task = data['task']
        
        # Create step planning prompt
        prompt = f"Create a step-by-step plan for: {task}\n\nSteps:\n1."
        
        logger.info("Generating step plan...")
        
        start_time = time.time()
        
        # Tokenize
        inputs = tokenizer(
            prompt, 
            return_tensors="pt", 
            max_length=200,
            truncation=True,
            padding=True
        )
        
        # Generate steps
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                attention_mask=inputs.attention_mask,
                max_length=200,
                num_beams=2,
                do_sample=False,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id
            )
        
        # Decode output
        steps = tokenizer.decode(outputs[0], skip_special_tokens=True)
        generation_time = time.time() - start_time
        
        logger.info(f"Step plan generated in {generation_time:.3f}s")
        
        return jsonify({
            'success': True,
            'data': {
                'steps': steps,
                'task': task,
                'generation_time': round(generation_time, 3),
                'model': MODEL_NAME,
                'operation': 'step_planning'
            }
        })
        
    except Exception as e:
        logger.error(f"Error generating steps: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/info', methods=['GET'])
def info():
    """Model information endpoint"""
    return jsonify({
        'model_name': MODEL_NAME,
        'model_type': 'FLAN-T5 Small',
        'model_size': '308MB',
        'model_loaded': model_loaded,
        'capabilities': [
            'text-generation', 
            'canvas-merging', 
            'step-planning',
            'question-answering',
            'summarization'
        ],
        'performance_target': '400-500ms',
        'max_length': MAX_LENGTH,
        'device': 'cpu',
        'use_cases': [
            'Canvas merging operations',
            'Step-by-step planning',
            'Fast text generation',
            'Context integration'
        ]
    })

if __name__ == '__main__':
    logger.info("Starting FLAN-T5 Small service...")
    
    # Load model on startup
    load_model()
    
    # Start Flask app
    port = int(os.getenv('PORT', 8004))  # Using port 8004 for FLAN-T5
    logger.info(f"FLAN-T5 service starting on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False) 