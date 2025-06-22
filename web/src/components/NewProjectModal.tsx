import React, { useState } from 'react';
import { 
  ServerIcon, 
  CircleStackIcon, 
  CpuChipIcon,
  ShieldCheckIcon,
  CloudIcon,
  GlobeAltIcon,
  ShoppingBagIcon,
  ChatBubbleBottomCenterTextIcon,
  PhotoIcon,
  CreditCardIcon,
  TruckIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const projectTemplates = [
  { 
    id: 'blank', 
    name: 'Blank Canvas', 
    description: 'Start from scratch with a clean canvas', 
    icon: DocumentTextIcon,
    color: 'bg-gray-50 border-gray-200',
    iconColor: 'text-gray-600',
    components: ['Empty Canvas'],
    category: 'Basic'
  },
  { 
    id: 'social-media-platform', 
    name: 'Social Media Platform', 
    description: 'Complete Instagram/Facebook-like social platform', 
    icon: PhotoIcon,
    color: 'bg-pink-50 border-pink-200',
    iconColor: 'text-pink-600',
    components: ['API Gateway', 'User Service', 'Content Service', 'Feed Algorithm', 'Media Storage', 'Notification Service', 'Analytics Engine', 'CDN', 'Redis Cache', 'MongoDB'],
    category: 'Enterprise'
  },
  { 
    id: 'ecommerce-marketplace', 
    name: 'E-commerce Marketplace', 
    description: 'Amazon-scale e-commerce platform with all components', 
    icon: ShoppingBagIcon,
    color: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
    components: ['Product Catalog', 'Order Management', 'Payment Gateway', 'Inventory Service', 'Recommendation Engine', 'Search Service', 'User Management', 'Cart Service', 'Shipping Service', 'Analytics'],
    category: 'Enterprise'
  },
  { 
    id: 'fintech-platform', 
    name: 'FinTech Platform', 
    description: 'Banking and financial services platform', 
    icon: CreditCardIcon,
    color: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
    components: ['Core Banking', 'Payment Processing', 'KYC Service', 'Fraud Detection', 'Trading Engine', 'Risk Management', 'Compliance Service', 'Analytics', 'Security Gateway'],
    category: 'Enterprise'
  },
  { 
    id: 'messaging-platform', 
    name: 'Messaging Platform', 
    description: 'WhatsApp/Slack-like messaging platform', 
    icon: ChatBubbleBottomCenterTextIcon,
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    components: ['Message Service', 'Real-time Engine', 'User Presence', 'Media Service', 'Push Notifications', 'Group Management', 'End-to-End Encryption', 'File Sharing'],
    category: 'Enterprise'
  },
  { 
    id: 'logistics-platform', 
    name: 'Logistics Platform', 
    description: 'Uber/DoorDash-like logistics and delivery platform', 
    icon: TruckIcon,
    color: 'bg-orange-50 border-orange-200',
    iconColor: 'text-orange-600',
    components: ['Route Optimization', 'Driver Management', 'Order Tracking', 'Payment Service', 'Location Service', 'Notification Service', 'Analytics Dashboard', 'Fleet Management'],
    category: 'Enterprise'
  },
  { 
    id: 'api-service', 
    name: 'API Microservice', 
    description: 'Simple RESTful API microservice with database', 
    icon: ServerIcon,
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    components: ['API Gateway', 'Service', 'Database', 'Cache'],
    category: 'Basic'
  },
  { 
    id: 'app-backend', 
    name: 'App Backend', 
    description: 'Backend for web/mobile app with authentication', 
    icon: GlobeAltIcon,
    color: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600',
    components: ['Load Balancer', 'Auth Service', 'App Service', 'Database', 'File Storage'],
    category: 'Basic'
  },
  { 
    id: 'microservices-platform', 
    name: 'Microservices Platform', 
    description: 'Full microservices architecture with service mesh', 
    icon: CloudIcon,
    color: 'bg-indigo-50 border-indigo-200',
    iconColor: 'text-indigo-600',
    components: ['Service Mesh', 'API Gateway', 'Multiple Services', 'Service Discovery', 'Circuit Breaker', 'Monitoring'],
    category: 'Advanced'
  },
  { 
    id: 'secure-platform', 
    name: 'Secure Platform', 
    description: 'Security-focused architecture with zero-trust', 
    icon: ShieldCheckIcon,
    color: 'bg-red-50 border-red-200',
    iconColor: 'text-red-600',
    components: ['Zero Trust Gateway', 'Identity Provider', 'Encryption Service', 'Audit Service', 'Threat Detection'],
    category: 'Advanced'
  },
  { 
    id: 'data-platform', 
    name: 'Data Platform', 
    description: 'Big data processing and analytics platform', 
    icon: CircleStackIcon,
    color: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
    components: ['Data Lake', 'Stream Processing', 'Batch Processing', 'ML Pipeline', 'Analytics Engine', 'Data Warehouse'],
    category: 'Advanced'
  },
  { 
    id: 'iot-platform', 
    name: 'IoT Platform', 
    description: 'Internet of Things device management platform', 
    icon: CpuChipIcon,
    color: 'bg-teal-50 border-teal-200',
    iconColor: 'text-teal-600',
    components: ['Device Gateway', 'Device Management', 'Data Ingestion', 'Rule Engine', 'Time Series DB', 'Dashboard'],
    category: 'Advanced'
  }
];

const categories = ['All', 'Basic', 'Enterprise', 'Advanced'];

export default function NewProjectModal({ 
  open, 
  onClose, 
  onCreate 
}: { 
  open: boolean; 
  onClose: () => void; 
  onCreate: (name: string, template: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(projectTemplates[0].id);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [creating, setCreating] = useState(false);

  if (!open) return null;

  const filteredTemplates = selectedCategory === 'All' 
    ? projectTemplates 
    : projectTemplates.filter(t => t.category === selectedCategory);

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    setCreating(true);
    try {
      await onCreate(name.trim(), selectedTemplate);
      setName('');
      setSelectedTemplate(projectTemplates[0].id);
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  const selectedTemplateData = projectTemplates.find(t => t.id === selectedTemplate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-3xl font-bold text-gray-900">Create New Project</h2>
          <p className="text-gray-600 mt-2">Choose from enterprise-grade templates or start from scratch</p>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Project Name */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              PROJECT NAME
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name (e.g., My Social Platform)"
              autoFocus
            />
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Template Selection */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              CHOOSE TEMPLATE
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const IconComponent = template.icon;
                const isSelected = selectedTemplate === template.id;
                
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`
                      p-5 rounded-2xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1
                      ${isSelected 
                        ? `${template.color} border-current shadow-xl scale-105 ring-4 ring-blue-200` 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`
                        p-3 rounded-xl ${isSelected ? 'bg-white bg-opacity-80' : template.color}
                      `}>
                        <IconComponent className={`w-7 h-7 ${template.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-base mb-1">
                          {template.name}
                        </div>
                        <div className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {template.description}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {template.components.slice(0, 3).map((component, idx) => (
                            <span 
                              key={idx}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                            >
                              {component}
                            </span>
                          ))}
                          {template.components.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{template.components.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Preview */}
          {selectedTemplateData && (
            <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200">
              <div className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                <selectedTemplateData.icon className={`w-6 h-6 ${selectedTemplateData.iconColor} mr-2`} />
                {selectedTemplateData.name} Components
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedTemplateData.components.map((component, idx) => (
                  <span 
                    key={idx}
                    className="text-sm bg-white text-gray-800 px-3 py-2 rounded-full border border-gray-200 shadow-sm"
                  >
                    {component}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedTemplateData?.category === 'Enterprise' && (
              <span className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                🚀 Enterprise Template
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {creating ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 