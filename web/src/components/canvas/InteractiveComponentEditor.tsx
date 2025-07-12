'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Node } from 'reactflow';

interface InteractiveComponentEditorProps {
  selectedNode: Node | null;
  canvasState: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  onClose: () => void;
  projectId: string;
}

interface ComponentSuggestion {
  id: string;
  type: 'property' | 'connection' | 'configuration' | 'optimization';
  title: string;
  description: string;
  action: any;
  confidence: number;
  reasoning: string;
  impact: 'low' | 'medium' | 'high';
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  suggestions: ComponentSuggestion[];
}

interface ComponentTemplate {
  id: string;
  name: string;
  description: string;
  properties: Record<string, any>;
  connections: string[];
  bestPractices: string[];
}

export const InteractiveComponentEditor: React.FC<InteractiveComponentEditorProps> = ({
  selectedNode,
  canvasState,
  onNodeUpdate,
  onClose,
  projectId
}) => {
  const [nodeData, setNodeData] = useState<any>(selectedNode?.data || {});
  const [suggestions, setSuggestions] = useState<ComponentSuggestion[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'properties' | 'suggestions' | 'validation' | 'templates'>('properties');
  const [templates, setTemplates] = useState<ComponentTemplate[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Component templates for different service types
  const componentTemplates: Record<string, ComponentTemplate> = {
    'microservice': {
      id: 'microservice',
      name: 'Microservice',
      description: 'A containerized microservice with REST API',
      properties: {
        port: 3000,
        framework: 'Express.js',
        database: 'PostgreSQL',
        authentication: 'JWT',
        monitoring: true,
        healthCheck: '/health'
      },
      connections: ['database', 'api-gateway', 'load-balancer'],
      bestPractices: [
        'Use health checks for monitoring',
        'Implement proper error handling',
        'Use environment variables for configuration',
        'Implement graceful shutdown'
      ]
    },
    'database': {
      id: 'database',
      name: 'Database',
      description: 'Persistent data storage solution',
      properties: {
        type: 'PostgreSQL',
        version: '13',
        storage: '100GB',
        backupRetention: '7 days',
        encryption: true,
        replication: false
      },
      connections: ['microservice', 'api'],
      bestPractices: [
        'Enable encryption at rest',
        'Set up regular backups',
        'Use connection pooling',
        'Monitor query performance'
      ]
    },
    'api-gateway': {
      id: 'api-gateway',
      name: 'API Gateway',
      description: 'Central entry point for API requests',
      properties: {
        rateLimiting: true,
        authentication: 'OAuth2',
        cors: true,
        logging: 'detailed',
        caching: true,
        timeout: 30000
      },
      connections: ['microservice', 'load-balancer'],
      bestPractices: [
        'Implement rate limiting',
        'Use proper authentication',
        'Enable request/response logging',
        'Configure CORS properly'
      ]
    }
  };

  useEffect(() => {
    setTemplates(Object.values(componentTemplates));
  }, []);

  // Debounced suggestions generation
  const generateSuggestions = useCallback(async () => {
    if (!selectedNode) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/simple-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyze and suggest improvements for ${selectedNode.data?.serviceType || 'component'}: ${selectedNode.data?.label}. Focus on component optimization and best practices.`,
          canvasId: projectId,
          userId: 'component-editor'
        })
      });

      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let suggestions: ComponentSuggestion[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'message' && data.content) {
                fullContent += data.content;
              } else if (data.type === 'action' && data.action === 'suggestions') {
                suggestions = extractComponentSuggestions(data.data);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }

      setSuggestions(suggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedNode, canvasState, projectId]);

  // Real-time validation
  const validateComponent = useCallback(async () => {
    if (!selectedNode) return;

    try {
      const response = await fetch('/api/simple-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Validate this component: ${selectedNode.data?.label} (${selectedNode.data?.serviceType || 'component'}). Check for configuration completeness, security compliance, performance optimization, and integration compatibility.`,
          canvasId: projectId,
          userId: 'component-editor'
        })
      });

      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let validationResult: ValidationResult = { isValid: true, errors: [], suggestions: [] };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'action' && data.action === 'validation') {
                validationResult = parseValidationResult(data.data);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }

      setValidation(validationResult);
    } catch (error) {
      console.error('Error validating component:', error);
    }
  }, [selectedNode, canvasState, projectId]);

  // Debounced property updates
  const updateProperty = useCallback((key: string, value: any) => {
    const updatedData = { ...nodeData, [key]: value };
    setNodeData(updatedData);
    setHasChanges(true);

    // Debounce suggestions generation
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      generateSuggestions();
      validateComponent();
    }, 1000);
  }, [nodeData, generateSuggestions, validateComponent]);

  const applySuggestion = useCallback(async (suggestion: ComponentSuggestion) => {
    if (!selectedNode) return;

    try {
      let updates = {};
      
      switch (suggestion.type) {
        case 'property':
          updates = suggestion.action.properties || {};
          break;
        case 'configuration':
          updates = suggestion.action.configuration || {};
          break;
        case 'optimization':
          updates = suggestion.action.optimizations || {};
          break;
      }

      const updatedData = { ...nodeData, ...updates };
      setNodeData(updatedData);
      setHasChanges(true);

      // Remove applied suggestion
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      
      // Re-validate after applying suggestion
      await validateComponent();
      
    } catch (error) {
      console.error('Error applying suggestion:', error);
    }
  }, [selectedNode, nodeData, validateComponent]);

  const applyTemplate = useCallback((template: ComponentTemplate) => {
    const updatedData = { 
      ...nodeData, 
      ...template.properties,
      serviceType: template.id,
      template: template.name 
    };
    setNodeData(updatedData);
    setHasChanges(true);
    generateSuggestions();
    validateComponent();
  }, [nodeData, generateSuggestions, validateComponent]);

  const saveChanges = useCallback(() => {
    if (selectedNode && hasChanges) {
      onNodeUpdate(selectedNode.id, nodeData);
      setHasChanges(false);
    }
  }, [selectedNode, nodeData, hasChanges, onNodeUpdate]);

  const resetChanges = useCallback(() => {
    if (selectedNode) {
      setNodeData(selectedNode.data || {});
      setHasChanges(false);
    }
  }, [selectedNode]);

  // Effect to initialize data when node changes
  useEffect(() => {
    if (selectedNode) {
      setNodeData(selectedNode.data || {});
      generateSuggestions();
      validateComponent();
    }
  }, [selectedNode, generateSuggestions, validateComponent]);

  // Helper functions
  const extractComponentSuggestions = (analysis: any): ComponentSuggestion[] => {
    if (!analysis?.suggestions) return [];
    
    return analysis.suggestions.map((suggestion: any, index: number) => ({
      id: `suggestion-${index}`,
      type: suggestion.type || 'optimization',
      title: suggestion.title || suggestion.text,
      description: suggestion.description || suggestion.text,
      action: suggestion.action || {},
      confidence: suggestion.confidence || 0.8,
      reasoning: suggestion.reasoning || 'AI-generated suggestion',
      impact: suggestion.impact || 'medium'
    }));
  };

  const parseValidationResult = (data: any): ValidationResult => {
    return {
      isValid: data.isValid || true,
      errors: data.errors || [],
      suggestions: extractComponentSuggestions(data) || []
    };
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <div className="text-center text-gray-500">
          Select a component to edit its properties
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {nodeData.label || 'Component Editor'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {nodeData.serviceType && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
              {nodeData.serviceType}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {(['properties', 'suggestions', 'validation', 'templates'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'suggestions' && suggestions.length > 0 && (
                <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1">
                  {suggestions.length}
                </span>
              )}
              {tab === 'validation' && validation && !validation.isValid && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1">
                  !
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'properties' && (
          <div className="p-4 space-y-4">
            {/* Basic Properties */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Component Name
              </label>
              <input
                type="text"
                value={nodeData.label || ''}
                onChange={(e) => updateProperty('label', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Enter component name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type
              </label>
              <select
                value={nodeData.serviceType || ''}
                onChange={(e) => updateProperty('serviceType', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Select type</option>
                <option value="microservice">Microservice</option>
                <option value="database">Database</option>
                <option value="api-gateway">API Gateway</option>
                <option value="frontend">Frontend</option>
                <option value="cache">Cache</option>
                <option value="queue">Message Queue</option>
              </select>
            </div>

            {/* Dynamic Properties based on service type */}
            {nodeData.serviceType === 'microservice' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Port
                  </label>
                  <input
                    type="number"
                    value={nodeData.port || ''}
                    onChange={(e) => updateProperty('port', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="3000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Framework
                  </label>
                  <select
                    value={nodeData.framework || ''}
                    onChange={(e) => updateProperty('framework', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select framework</option>
                    <option value="Express.js">Express.js</option>
                    <option value="Fastify">Fastify</option>
                    <option value="NestJS">NestJS</option>
                    <option value="Koa">Koa</option>
                  </select>
                </div>
              </>
            )}

            {nodeData.serviceType === 'database' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Database Type
                  </label>
                  <select
                    value={nodeData.type || ''}
                    onChange={(e) => updateProperty('type', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select database</option>
                    <option value="PostgreSQL">PostgreSQL</option>
                    <option value="MongoDB">MongoDB</option>
                    <option value="MySQL">MySQL</option>
                    <option value="Redis">Redis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Storage Size
                  </label>
                  <input
                    type="text"
                    value={nodeData.storage || ''}
                    onChange={(e) => updateProperty('storage', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="100GB"
                  />
                </div>
              </>
            )}

            {/* Security Settings */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Security</h4>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={nodeData.encryption || false}
                    onChange={(e) => updateProperty('encryption', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Encryption</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={nodeData.monitoring || false}
                    onChange={(e) => updateProperty('monitoring', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Monitoring</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="p-4 space-y-4">
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <div className="text-sm text-gray-500 mt-2">Generating suggestions...</div>
              </div>
            )}

            {!isLoading && suggestions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">No suggestions available</div>
                <button
                  onClick={generateSuggestions}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Generate Suggestions
                </button>
              </div>
            )}

            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 text-sm">{suggestion.title}</h5>
                    <p className="text-xs text-gray-600 mt-1">{suggestion.description}</p>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <span className={`text-xs px-2 py-1 rounded ${getImpactColor(suggestion.impact)}`}>
                      {suggestion.impact}
                    </span>
                    <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mb-3">
                  💡 {suggestion.reasoning}
                </div>
                
                <button
                  onClick={() => applySuggestion(suggestion)}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Apply Suggestion
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="p-4 space-y-4">
            {validation ? (
              <>
                <div className={`p-3 rounded-lg ${validation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center space-x-2">
                    <span className={validation.isValid ? 'text-green-600' : 'text-red-600'}>
                      {validation.isValid ? '✓' : '⚠️'}
                    </span>
                    <span className={`font-medium ${validation.isValid ? 'text-green-800' : 'text-red-800'}`}>
                      {validation.isValid ? 'Component is valid' : 'Validation issues found'}
                    </span>
                  </div>
                </div>

                {validation.errors.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900">Issues:</h5>
                    {validation.errors.map((error, index) => (
                      <div key={index} className={`p-2 rounded text-sm ${
                        error.severity === 'error' ? 'bg-red-50 text-red-700' :
                        error.severity === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        <strong>{error.field}:</strong> {error.message}
                      </div>
                    ))}
                  </div>
                )}

                {validation.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900">Recommendations:</h5>
                    {validation.suggestions.map((suggestion) => (
                      <div key={suggestion.id} className="border border-gray-200 rounded p-2">
                        <div className="text-sm font-medium">{suggestion.title}</div>
                        <div className="text-xs text-gray-600">{suggestion.description}</div>
                        <button
                          onClick={() => applySuggestion(suggestion)}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Apply Fix
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <button
                  onClick={validateComponent}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Run Validation
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="p-4 space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Apply a template to quickly configure your component with best practices.
            </div>
            
            {templates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-3">
                <div className="mb-2">
                  <h5 className="font-medium text-gray-900">{template.name}</h5>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
                
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-700 mb-1">Best Practices:</div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {template.bestPractices.slice(0, 2).map((practice, index) => (
                      <li key={index}>• {practice}</li>
                    ))}
                  </ul>
                </div>
                
                <button
                  onClick={() => applyTemplate(template)}
                  className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                >
                  Apply Template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {hasChanges && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex space-x-2">
            <button
              onClick={saveChanges}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={resetChanges}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveComponentEditor; 