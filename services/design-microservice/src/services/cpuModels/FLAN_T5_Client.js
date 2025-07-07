import logger from '../../utils/logger.js';
import axios from 'axios';
import { config } from '../../config/index.js';

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
    logger.info('🤖 FLAN-T5 Client initialized');
  }

  /**
   * Merge new canvas elements with existing state
   */
  async mergeCanvasElements(newElements, existingState) {
    try {
      logger.info('🔄 [FLAN-T5] Starting canvas element merging:', {
        newElementsCount: newElements?.nodes?.length || 0,
        existingElementsCount: existingState?.nodes?.length || 0,
        endpoint: this.endpoint
      });

      // Prepare prompt for FLAN-T5
      const prompt = this.buildMergePrompt(newElements, existingState);
      
      // Log the complete prompt being sent to FLAN-T5
      logger.info('📝 [FLAN-T5 PROMPT] Complete prompt being sent to FLAN-T5:', {
        promptLength: prompt.length,
        fullPrompt: prompt
      });

      // Call FLAN-T5 endpoint
      const startTime = Date.now();
      const response = await this.client.post('/merge', {
        prompt,
        max_length: 1024,
        temperature: 0.3
      });
      const responseTime = Date.now() - startTime;

      // Log the complete response from FLAN-T5
      logger.info('📄 [FLAN-T5 RESPONSE] Complete response from FLAN-T5:', {
        responseTime: `${responseTime}ms`,
        responseData: response.data,
        mergedElementsRaw: response.data.merged_elements
      });

      // Parse and validate merged elements
      const mergedElements = this.parseMergedElements(response.data.merged_elements);
      
      // Log the parsed merged elements
      logger.info('🔧 [FLAN-T5 PARSED] Parsed merged elements:', {
        parsedElements: mergedElements,
        nodesCount: mergedElements?.nodes?.length || 0,
        edgesCount: mergedElements?.edges?.length || 0
      });
      
      // Validate structure
      if (!this.validateElementStructure(mergedElements)) {
        logger.error('❌ [FLAN-T5 VALIDATION] Invalid element structure after merging:', {
          mergedElements,
          validationFailed: true
        });
        throw new Error('Invalid element structure after merging');
      }

      logger.info('✅ [FLAN-T5] Canvas element merging completed successfully:', {
        finalNodesCount: mergedElements.nodes.length,
        finalEdgesCount: mergedElements.edges.length,
        processingTime: `${responseTime}ms`
      });

      return mergedElements;

    } catch (error) {
      logger.error('❌ [FLAN-T5] Error merging canvas elements:', {
        error: error.message,
        stack: error.stack,
        endpoint: this.endpoint,
        newElements,
        existingState
      });
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