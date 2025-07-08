#!/usr/bin/env python3
"""
FLAN-T5 Small Model Service
Supports multiple use cases:
1. Canvas Element Merging - Structured JSON output
2. Dynamic Prompt Generation - Context-aware prompts
3. Documentation Generation - OpenAPI, DB, Code docs
4. Mock Data Generation - Test data for APIs
"""

import os
import logging
import time
import json
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

# Model configuration
MODEL_NAME = "google/flan-t5-small"  # 308MB model for fast inference
CACHE_DIR = "/app/models"
MAX_LENGTH = int(os.getenv('MAX_LENGTH', 512))

# Task-specific configurations
TASK_CONFIGS = {
    'canvas_merge': {
        'temperature': 0.3,
        'min_length': 50,
        'max_length': 1024,
        'num_beams': 5,
        'length_penalty': 1.0,
        'do_sample': False,  # Deterministic for JSON
        'repetition_penalty': 1.2
    },
    'prompt_generation': {
        'temperature': 0.7,
        'min_length': 30,
        'max_length': 512,
        'num_beams': 4,
        'length_penalty': 1.1,
        'do_sample': True,
        'top_k': 50,
        'top_p': 0.9,
        'repetition_penalty': 1.3
    },
    'documentation': {
        'temperature': 0.4,
        'min_length': 100,
        'max_length': 768,
        'num_beams': 4,
        'length_penalty': 1.2,
        'do_sample': True,
        'top_k': 40,
        'top_p': 0.85,
        'repetition_penalty': 1.3
    },
    'mock_data': {
        'temperature': 0.8,  # Higher for more varied data
        'min_length': 50,
        'max_length': 512,
        'num_beams': 3,
        'do_sample': True,
        'top_k': 50,
        'top_p': 0.95,
        'repetition_penalty': 1.1
    }
}

def load_model():
    """Load FLAN-T5 Small model and tokenizer with proper compatibility"""
    global model, tokenizer, model_loaded
    
    try:
        logger.info(f"Loading FLAN-T5 Small model: {MODEL_NAME}")
        
        os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
        os.environ['TRANSFORMERS_CACHE'] = CACHE_DIR
        
        tokenizer = AutoTokenizer.from_pretrained(
            MODEL_NAME,
            cache_dir=CACHE_DIR,
            trust_remote_code=True
        )
        
        model = AutoModelForSeq2SeqLM.from_pretrained(
            MODEL_NAME,
            cache_dir=CACHE_DIR,
            torch_dtype=torch.float32
        )
        
        model = model.to('cpu')
        
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
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
        'supported_tasks': list(TASK_CONFIGS.keys()),
        'timestamp': time.time()
    })

@app.route('/generate', methods=['POST'])
def generate():
    """Generate text using FLAN-T5 Small with task-specific configurations"""
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
        
        # Get task type and config
        task_type = data.get('task_type', 'prompt_generation')
        config = TASK_CONFIGS.get(task_type, TASK_CONFIGS['prompt_generation'])
        
        prompt = data['prompt']
        max_length = min(data.get('max_length', config['max_length']), 1024)
        
        logger.info(f"Generating {task_type} output for prompt: {prompt[:50]}...")
        
        start_time = time.time()
        
        # Tokenize input
        inputs = tokenizer(
            prompt, 
            return_tensors="pt", 
            max_length=512,
            truncation=True,
            padding=True
        )
        
        # Generate with task-specific settings
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                attention_mask=inputs.attention_mask,
                max_length=max_length,
                min_length=config['min_length'],
                num_beams=config['num_beams'],
                length_penalty=config.get('length_penalty', 1.0),
                early_stopping=True,
                do_sample=config['do_sample'],
                temperature=config['temperature'],
                top_k=config.get('top_k', None),
                top_p=config.get('top_p', None),
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
                repetition_penalty=config['repetition_penalty']
            )
        
        # Decode output
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Post-process based on task type
        if task_type == 'canvas_merge':
            try:
                # Ensure valid JSON for canvas merging
                generated_text = json.loads(generated_text)
            except:
                logger.warning("Failed to parse JSON, returning raw text")
        
        generation_time = time.time() - start_time
        
        logger.info(f"Generated {task_type} output in {generation_time:.3f}s")
        
        return jsonify({
            'success': True,
            'data': {
                'generated_text': generated_text,
                'task_type': task_type,
                'generation_time': round(generation_time, 3),
                'model': MODEL_NAME,
                'config_used': config
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
        
        # Use canvas_merge task configuration
        config = TASK_CONFIGS['canvas_merge']
        
        # Tokenize with canvas-optimized settings
        inputs = tokenizer(
            prompt, 
            return_tensors="pt", 
            max_length=512,
            truncation=True,
            padding=True
        )
        
        # Generate with canvas-optimized settings
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                attention_mask=inputs.attention_mask,
                max_length=config['max_length'],
                min_length=config['min_length'],
                num_beams=config['num_beams'],
                length_penalty=config['length_penalty'],
                do_sample=config['do_sample'],
                temperature=config['temperature'],
                repetition_penalty=config['repetition_penalty'],
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id
            )
        
        # Decode output
        merged_result = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Try to parse as JSON
        try:
            merged_result = json.loads(merged_result)
        except:
            logger.warning("Failed to parse merged result as JSON")
        
        generation_time = time.time() - start_time
        
        logger.info(f"Canvas merge completed in {generation_time:.3f}s")
        
        return jsonify({
            'success': True,
            'data': {
                'merged_canvas': merged_result,
                'original_canvas': canvas_data,
                'merge_time': round(generation_time, 3),
                'model': MODEL_NAME,
                'operation': 'canvas_merge',
                'config_used': config
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
        plan_type = data.get('plan_type', 'general')  # Can be 'general', 'technical', 'design'
        
        # Create step planning prompt based on plan type
        prompt_templates = {
            'general': f"Create a step-by-step plan for: {task}\n\nProvide a detailed breakdown with clear steps, estimated time, and key considerations.\n\nPlan:",
            'technical': f"Create a technical implementation plan for: {task}\n\nInclude:\n1. Setup steps\n2. Development phases\n3. Testing requirements\n4. Deployment considerations\n\nDetailed Plan:",
            'design': f"Create a design and implementation plan for: {task}\n\nCover:\n1. Design requirements\n2. UI/UX considerations\n3. Component breakdown\n4. Implementation steps\n\nPlan:"
        }
        
        prompt = prompt_templates.get(plan_type, prompt_templates['general'])
        
        logger.info(f"Generating {plan_type} plan...")
        
        start_time = time.time()
        
        # Use documentation config as base for detailed plans
        config = TASK_CONFIGS['documentation']
        
        # Tokenize
        inputs = tokenizer(
            prompt, 
            return_tensors="pt", 
            max_length=512,
            truncation=True,
            padding=True
        )
        
        # Generate steps
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                attention_mask=inputs.attention_mask,
                max_length=config['max_length'],
                min_length=config['min_length'],
                num_beams=config['num_beams'],
                length_penalty=config['length_penalty'],
                do_sample=config['do_sample'],
                temperature=config['temperature'],
                top_k=config['top_k'],
                top_p=config['top_p'],
                repetition_penalty=config['repetition_penalty'],
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
                'plan_type': plan_type,
                'generation_time': round(generation_time, 3),
                'model': MODEL_NAME,
                'operation': 'step_planning',
                'config_used': config
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
            'documentation-generation',
            'mock-data-generation',
            'prompt-generation'
        ],
        'supported_tasks': list(TASK_CONFIGS.keys()),
        'endpoints': {
            '/generate': 'General-purpose generation with task-specific configs',
            '/merge': 'Specialized canvas element merging',
            '/plan': 'Step-by-step planning with different plan types',
            '/info': 'Model information and capabilities'
        },
        'device': 'cpu',
        'max_length': MAX_LENGTH,
        'task_configs': TASK_CONFIGS
    })

if __name__ == '__main__':
    load_model()
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 8001))) 