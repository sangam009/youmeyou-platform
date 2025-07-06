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
      logger.info('🔄 Merging canvas elements with FLAN-T5');

      // Prepare prompt for FLAN-T5
      const prompt = this.buildMergePrompt(newElements, existingState);

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