import logger from '../../utils/logger.js';
import axios from 'axios';
import { config } from '../../config/index.js';
import { apiMonitor } from '../../utils/apiMonitor.js';

/**
 * FLAN-T5 Client for Canvas Element Merging
 * Uses FLAN-T5 CPU model for efficient canvas element merging
 */
export class FLAN_T5_Client {
  constructor() {
    this.endpoint = config.cpuModels.flant5Endpoint;
    this.client = axios.create({
      baseURL: this.endpoint,
      timeout: 30000
    });
    this.requestCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.lastRequestTime = null;
    
    logger.info('🤖 FLAN-T5 Client initialized:', {
      endpoint: this.endpoint,
      timeout: 30000,
      status: 'ready'
    });
  }

  /**
   * Send request to FLAN-T5 model with enhanced logging
   */
  async sendRequest(endpoint, data) {
    this.requestCount++;
    const requestId = `flant5-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Log full prompt/data
    logger.info('📝 [FLAN-T5 PROMPT] Full request data:', {
      requestId,
      endpoint,
      fullData: data,
      timestamp: new Date().toISOString()
    });

    logger.info('📤 [FLAN-T5 REQUEST] Sending request:', {
      requestId,
      endpoint,
      requestCount: this.requestCount,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await this.client.post(endpoint, data);
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      this.successCount++;
      this.lastRequestTime = processingTime;

      // Log full response
      logger.info('�� [FLAN-T5 RESPONSE] Full response data:', {
        requestId,
        fullResponse: response.data,
        timestamp: new Date().toISOString()
      });

      // Track successful API call
      apiMonitor.trackCPUCall({
        requestId,
        model: 'flan-t5',
        endpoint,
        success: true,
        responseTime: processingTime,
        inputSize: JSON.stringify(data).length,
        outputSize: JSON.stringify(response.data).length
      });

      logger.info('✅ [FLAN-T5 RESPONSE] Request successful:', {
        requestId,
        processingTime: `${processingTime}ms`,
        status: response.status,
        statistics: {
          totalRequests: this.requestCount,
          successRate: `${((this.successCount / this.requestCount) * 100).toFixed(1)}%`,
          averageTime: this.lastRequestTime
        }
      });

      return response.data;

    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      this.failureCount++;

      // Track failed API call
      apiMonitor.trackCPUCall({
        requestId,
        model: 'flan-t5',
        endpoint,
        success: false,
        responseTime: processingTime,
        error: error.message,
        inputSize: JSON.stringify(data).length
      });

      logger.error('❌ [FLAN-T5 ERROR] Request failed:', {
        requestId,
        endpoint,
        error: error.message,
        processingTime: `${processingTime}ms`,
        requestData: {
          inputPreview: JSON.stringify(data).substring(0, 100) + '...'
        },
        statistics: {
          totalRequests: this.requestCount,
          failureRate: `${((this.failureCount / this.requestCount) * 100).toFixed(1)}%`,
          consecutiveFailures: this.getConsecutiveFailures()
        }
      });

      throw error;
    }
  }

  /**
   * Track consecutive failures for circuit breaking
   */
  getConsecutiveFailures() {
    return this.failureCount - this.lastSuccessCount;
  }

  /**
   * Get client health metrics
   */
  getHealthMetrics() {
    return {
      totalRequests: this.requestCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: `${((this.successCount / this.requestCount) * 100).toFixed(1)}%`,
      lastRequestTime: this.lastRequestTime,
      averageResponseTime: this.lastRequestTime, // Implement rolling average in future
      endpoint: this.endpoint,
      status: this.failureCount > 5 ? 'degraded' : 'healthy'
    };
  }

  /**
   * Merge new canvas elements with existing state
   */
  async mergeCanvasElements(newElements, existingState) {
    try {
      const requestId = `merge-${Date.now()}`;
      logger.info('🔄 Starting canvas merge operation:', {
        requestId,
        existingElementCount: Object.keys(existingState).length,
        newElementCount: Object.keys(newElements).length
      });

      logger.info('📊 Pre-merge state:', {
        requestId,
        existingState: JSON.stringify(existingState, null, 2),
        newElements: JSON.stringify(newElements, null, 2)
      });

      // Prepare prompt for FLAN-T5
      const prompt = this.buildMergePrompt(newElements, existingState);

      logger.info('📝 Merge prompt:', {
        requestId,
        prompt
      });

      // Call FLAN-T5 endpoint
      const response = await this.client.post('/merge', {
        prompt,
        max_length: 1024,
        temperature: 0.3
      });

      // Parse and validate merged elements
      const mergedElements = this.parseMergedElements(response.data.merged_elements);
      
      // Validate structure
      if (!this.validateElementStructure(mergedElements)) {
        throw new Error('Invalid element structure after merging');
      }

      logger.info('✅ Merge completed:', {
        requestId,
        mergedElementCount: Object.keys(mergedElements).length,
        addedElements: Object.keys(mergedElements).filter(id => !existingState[id]),
        updatedElements: Object.keys(mergedElements).filter(id => existingState[id] && JSON.stringify(existingState[id]) !== JSON.stringify(mergedElements[id])),
        removedElements: Object.keys(existingState).filter(id => !mergedElements[id])
      });

      logger.info('📊 Post-merge state:', {
        requestId,
        mergedElements: JSON.stringify(mergedElements, null, 2)
      });

      return mergedElements;

    } catch (error) {
      logger.error('❌ Error merging canvas elements:', error);
      throw error;
    }
  }

  /**
   * Build prompt for FLAN-T5 merging
   */
  buildMergePrompt(newElements, existingState) {
    return `Merge the following canvas elements:

EXISTING STATE:
${JSON.stringify(existingState, null, 2)}

NEW ELEMENTS:
${JSON.stringify(newElements, null, 2)}

Rules:
1. Preserve existing element IDs and positions when possible
2. Add new elements with unique IDs
3. Update properties of existing elements if changed
4. Maintain connections and relationships
5. Remove elements marked for deletion
6. Validate final structure

Output the merged elements in JSON format.`;
  }

  /**
   * Parse merged elements from FLAN-T5 response
   */
  parseMergedElements(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Error parsing merged elements:', error);
      throw new Error('Failed to parse merged elements');
    }
  }

  /**
   * Validate merged element structure
   */
  validateElementStructure(elements) {
    // Check if elements is an object
    if (!elements || typeof elements !== 'object') {
      return false;
    }

    // Required properties
    const requiredProps = ['nodes', 'edges', 'metadata'];
    for (const prop of requiredProps) {
      if (!elements[prop]) {
        return false;
      }
    }

    // Validate nodes
    if (!Array.isArray(elements.nodes)) {
      return false;
    }

    // Check each node
    for (const node of elements.nodes) {
      if (!node.id || !node.type || !node.position || !node.data) {
        return false;
      }
    }

    // Validate edges
    if (!Array.isArray(elements.edges)) {
      return false;
    }

    // Check each edge
    for (const edge of elements.edges) {
      if (!edge.id || !edge.source || !edge.target) {
        return false;
      }
    }

    return true;
  }
} 