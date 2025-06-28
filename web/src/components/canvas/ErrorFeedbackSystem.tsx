'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ErrorFeedbackSystemProps {
  error: string | null;
  streamStatus: string;
  context?: {
    projectId: string;
    canvasState: any;
    userAction?: string;
  };
  onRetry?: () => void;
  onRecover?: (strategy: RecoveryStrategy) => void;
  onDismiss?: () => void;
}

interface RecoveryStrategy {
  id: string;
  title: string;
  description: string;
  action: string;
  confidence: number;
  automatic: boolean;
  data?: any;
}

interface ErrorAnalysis {
  category: 'network' | 'validation' | 'permission' | 'data' | 'system' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  userMessage: string;
  technicalDetails: string;
  suggestions: RecoveryStrategy[];
  preventionTips: string[];
}

export const ErrorFeedbackSystem: React.FC<ErrorFeedbackSystemProps> = ({
  error,
  streamStatus,
  context,
  onRetry,
  onRecover,
  onDismiss
}) => {
  const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<RecoveryStrategy | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [userFeedback, setUserFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Analyze error when it changes
  useEffect(() => {
    if (error && context) {
      analyzeError(error, context);
    }
  }, [error, context]);

  const analyzeError = useCallback(async (errorMessage: string, errorContext: any) => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/canvas/dynamic-prompting/error-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: errorMessage,
          context: errorContext,
          streamStatus,
          userAction: errorContext.userAction,
          canvasState: errorContext.canvasState
        })
      });

      const result = await response.json();

      if (result.success) {
        setErrorAnalysis(result.data.analysis);
        
        // Auto-apply high-confidence recovery strategies
        const autoStrategy = result.data.analysis.suggestions.find(
          (s: RecoveryStrategy) => s.automatic && s.confidence > 0.9
        );
        
        if (autoStrategy && onRecover) {
          setTimeout(() => {
            onRecover(autoStrategy);
          }, 2000); // Brief delay to show the error first
        }
      } else {
        // Fallback analysis if API fails
        setErrorAnalysis(generateFallbackAnalysis(errorMessage));
      }
    } catch (error) {
      console.error('Error analyzing error:', error);
      setErrorAnalysis(generateFallbackAnalysis(errorMessage));
    } finally {
      setIsAnalyzing(false);
    }
  }, [streamStatus, onRecover]);

  const generateFallbackAnalysis = (errorMessage: string): ErrorAnalysis => {
    // Basic error categorization
    let category: ErrorAnalysis['category'] = 'unknown';
    let severity: ErrorAnalysis['severity'] = 'medium';
    let recoverable = true;

    if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
      category = 'network';
      severity = 'high';
    } else if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('unauthorized')) {
      category = 'permission';
      severity = 'high';
      recoverable = false;
    } else if (errorMessage.toLowerCase().includes('validation') || errorMessage.toLowerCase().includes('invalid')) {
      category = 'validation';
      severity = 'medium';
    }

    return {
      category,
      severity,
      recoverable,
      userMessage: `We encountered ${category === 'unknown' ? 'an issue' : `a ${category} issue`}. ${recoverable ? 'We can help fix this.' : 'Please check your permissions and try again.'}`,
      technicalDetails: errorMessage,
      suggestions: recoverable ? [
        {
          id: 'retry',
          title: 'Retry Operation',
          description: 'Try the operation again',
          action: 'retry',
          confidence: 0.7,
          automatic: false
        }
      ] : [],
      preventionTips: [
        'Ensure stable internet connection',
        'Check your permissions',
        'Verify input data is correct'
      ]
    };
  };

  const handleRecoveryAction = useCallback(async (strategy: RecoveryStrategy) => {
    setSelectedStrategy(strategy);
    
    if (onRecover) {
      onRecover(strategy);
    }
    
    // For retry actions, also call the retry callback if available
    if (strategy.action === 'retry' && onRetry) {
      onRetry();
    }
  }, [onRecover, onRetry]);

  const submitFeedback = useCallback(async () => {
    if (!userFeedback.trim() || !errorAnalysis) return;

    try {
      await fetch('/api/canvas/error-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error,
          analysis: errorAnalysis,
          userFeedback: userFeedback,
          context: context
        })
      });

      setFeedbackSubmitted(true);
      setTimeout(() => {
        setUserFeedback('');
        setFeedbackSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  }, [userFeedback, errorAnalysis, error, context]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50 text-red-800';
      case 'high': return 'border-red-400 bg-red-50 text-red-700';
      case 'medium': return 'border-yellow-400 bg-yellow-50 text-yellow-700';
      case 'low': return 'border-blue-400 bg-blue-50 text-blue-700';
      default: return 'border-gray-400 bg-gray-50 text-gray-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'network': return '🌐';
      case 'validation': return '⚠️';
      case 'permission': return '🔒';
      case 'data': return '📊';
      case 'system': return '⚙️';
      default: return '❗';
    }
  };

  if (!error) return null;

  return (
    <div className={`border rounded-lg p-4 shadow-lg max-w-2xl ${
      errorAnalysis ? getSeverityColor(errorAnalysis.severity) : 'border-red-400 bg-red-50 text-red-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">
            {errorAnalysis ? getCategoryIcon(errorAnalysis.category) : '❗'}
          </span>
          <div>
            <h3 className="font-semibold text-lg">
              {errorAnalysis ? `${errorAnalysis.category.charAt(0).toUpperCase() + errorAnalysis.category.slice(1)} Error` : 'Error Occurred'}
            </h3>
            <p className="text-sm opacity-75">
              {errorAnalysis ? `Severity: ${errorAnalysis.severity}` : 'Analyzing...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isAnalyzing && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-current opacity-60 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      <div className="mb-4">
        <p className="font-medium">
          {errorAnalysis ? errorAnalysis.userMessage : error}
        </p>
      </div>

      {/* Recovery Strategies */}
      {errorAnalysis?.suggestions && errorAnalysis.suggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">💡 Suggested Solutions:</h4>
          <div className="space-y-2">
            {errorAnalysis.suggestions.map((strategy) => (
              <div
                key={strategy.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedStrategy?.id === strategy.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
                onClick={() => handleRecoveryAction(strategy)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{strategy.title}</span>
                  <div className="flex items-center space-x-2">
                    {strategy.automatic && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Auto
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {Math.round(strategy.confidence * 100)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{strategy.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical Details (collapsible) */}
      <div className="mb-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm underline opacity-75 hover:opacity-100 transition-opacity"
        >
          {showDetails ? 'Hide' : 'Show'} Technical Details
        </button>
        
        {showDetails && (
          <div className="mt-2 p-3 bg-gray-100 rounded border text-sm font-mono text-gray-800">
            {errorAnalysis?.technicalDetails || error}
          </div>
        )}
      </div>

      {/* Prevention Tips */}
      {errorAnalysis?.preventionTips && errorAnalysis.preventionTips.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">🛡️ Prevention Tips:</h4>
          <ul className="text-sm space-y-1">
            {errorAnalysis.preventionTips.map((tip, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-xs mt-1">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* User Feedback */}
      <div className="border-t pt-3">
        <h4 className="font-medium mb-2">📝 Help us improve:</h4>
        <div className="space-y-2">
          <textarea
            value={userFeedback}
            onChange={(e) => setUserFeedback(e.target.value)}
            placeholder="Tell us what you were trying to do when this error occurred..."
            className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
            rows={2}
            disabled={feedbackSubmitted}
          />
          <div className="flex items-center space-x-2">
            <button
              onClick={submitFeedback}
              disabled={!userFeedback.trim() || feedbackSubmitted}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {feedbackSubmitted ? 'Submitted ✓' : 'Submit Feedback'}
            </button>
            {feedbackSubmitted && (
              <span className="text-sm text-green-600">Thank you for your feedback!</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center space-x-2 pt-3 border-t">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        )}
        {errorAnalysis?.recoverable && (
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
          >
            Refresh Page
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorFeedbackSystem; 