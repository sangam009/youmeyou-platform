# 🎯 GRANULAR TASK BREAKDOWN
## **Phase-by-Phase Implementation with CPU Model Priority**

### **💡 COST-OPTIMIZATION STRATEGY**

**Primary Goal**: Use CPU models (FLAN-T5, DistilBERT, etc.) for 80% of tasks, LLMs only for critical accuracy needs.

**Cost Structure**:
- **CPU Models**: $0 per request (self-hosted)
- **LLM Models**: $0.10-0.50 per request
- **Target**: 90% cost reduction through intelligent model routing

---

## **📋 PHASE 1: FOUNDATION & A2A INTEGRATION**
### **Week 1-2: Core Streaming Infrastructure**

#### **🔧 TASK GROUP 1.1: A2A SDK Setup (Week 1, Days 1-3)**

**Task 1.1.1: Install A2A Dependencies**
- **Scope**: Backend service dependency management
- **Files**: `services/design-microservice/package.json`
- **Commands**:
  ```bash
  cd services/design-microservice
  npm install @a2a-js/sdk
  npm install uuid
  ```
- **Acceptance**: A2A SDK installed, no errors
- **Time**: 30 minutes

**Task 1.1.2: Uncomment A2A Client Configuration**
- **Scope**: Enable real A2A client in a2aService.js
- **Files**: `services/design-microservice/src/services/a2aService.js`
- **Changes**:
  ```javascript
  // BEFORE (lines 1-12)
  // const { A2AClient } = require('@a2a-js/sdk'); // COMMENTED
  
  // AFTER
  const { A2AClient } = require('@a2a-js/sdk');
  
  // Initialize A2A client
  this.a2aClient = new A2AClient({
    baseUrl: process.env.A2A_BASE_URL || 'http://localhost:4001'
  });
  ```
- **Acceptance**: A2A client initializes without errors
- **Time**: 15 minutes

**Task 1.1.3: Create A2A Environment Variables**
- **Scope**: Configuration management
- **Files**: `services/design-microservice/.env`
- **Content**:
  ```bash
  A2A_BASE_URL=http://localhost:4001
  A2A_API_KEY=your_api_key_here
  A2A_PROJECT_ID=youmeyou-platform
  ```
- **Acceptance**: Environment variables loaded correctly
- **Time**: 10 minutes

**Task 1.1.4: Test A2A Connection**
- **Scope**: Verify A2A client connectivity
- **Files**: `services/design-microservice/src/test/a2a-connection.test.js`
- **Test**:
  ```javascript
  const { A2AClient } = require('@a2a-js/sdk');
  
  async function testA2AConnection() {
    const client = new A2AClient(process.env.A2A_BASE_URL);
    // Test basic connection
    console.log('A2A connection test passed');
  }
  ```
- **Acceptance**: Connection test passes
- **Time**: 20 minutes

---

#### **🤖 TASK GROUP 1.2: CPU Model Integration (Week 1, Days 4-5)**

**Task 1.2.1: Setup Local CPU Model Server**
- **Scope**: Self-hosted model infrastructure
- **Files**: `services/cpu-models/docker-compose.yml`
- **Models to Deploy**:
  ```yaml
  version: '3.8'
  services:
    flan-t5-small:
      image: huggingface/transformers:latest
      ports: ["8001:8000"]
      environment:
        - MODEL_NAME=google/flan-t5-small
        - MAX_LENGTH=512
    
    distilbert-base:
      image: huggingface/transformers:latest  
      ports: ["8002:8000"]
      environment:
        - MODEL_NAME=distilbert-base-uncased
        - TASK_TYPE=classification
  ```
- **Acceptance**: 2 CPU models running locally
- **Time**: 2 hours

**Task 1.2.2: Create CPU Model Router**
- **Scope**: Intelligent model selection
- **Files**: `services/design-microservice/src/services/cpuModelRouter.js`
- **Logic**:
  ```javascript
  class CPUModelRouter {
    routeTask(task) {
      const complexity = this.analyzeComplexity(task);
      
      if (complexity < 0.3) {
        return 'flan-t5-small'; // Simple tasks
      } else if (complexity < 0.7) {
        return 'distilbert-base'; // Medium tasks
      } else {
        return 'llm-fallback'; // Complex tasks only
      }
    }
    
    analyzeComplexity(task) {
      // CPU-based complexity analysis
      const wordCount = task.content.split(' ').length;
      const hasCode = task.content.includes('function') || task.content.includes('class');
      const hasArchitecture = task.content.includes('architecture') || task.content.includes('system');
      
      let score = 0;
      if (wordCount > 100) score += 0.3;
      if (hasCode) score += 0.4;
      if (hasArchitecture) score += 0.3;
      
      return Math.min(score, 1.0);
    }
  }
  ```
- **Acceptance**: Router selects appropriate model based on complexity
- **Time**: 3 hours

**Task 1.2.3: Implement CPU Model API Client**
- **Scope**: Communication with local CPU models
- **Files**: `services/design-microservice/src/services/cpuModelClient.js`
- **Implementation**:
  ```javascript
  class CPUModelClient {
    async callFlanT5(prompt, maxTokens = 256) {
      const response = await fetch('http://localhost:8001/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          max_length: maxTokens,
          temperature: 0.7
        })
      });
      return await response.json();
    }
    
    async callDistilBERT(text, labels) {
      const response = await fetch('http://localhost:8002/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, labels })
      });
      return await response.json();
    }
  }
  ```
- **Acceptance**: Can communicate with both CPU models
- **Time**: 1 hour

---

#### **🔄 TASK GROUP 1.3: Streaming Implementation (Week 1, Days 6-7)**

**Task 1.3.1: Create SSE Streaming Controller**
- **Scope**: Server-Sent Events endpoint
- **Files**: `services/design-microservice/src/controllers/sseController.js`
- **Implementation**:
  ```javascript
  class SSEController {
    async streamA2AResponse(req, res) {
      const { clientId, task } = req.query;
      
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      
      // Store connection
      this.activeStreams.set(clientId, res);
      
      // Start streaming
      await this.processTaskWithStreaming(task, (event) => {
        this.sendSSE(res, event.type, event.data);
      });
    }
    
    sendSSE(res, event, data) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }
  ```
- **Acceptance**: SSE endpoint working, can stream events
- **Time**: 2 hours

**Task 1.3.2: Integrate A2A Streaming with CPU Models**
- **Scope**: Connect A2A streaming to CPU model processing
- **Files**: `services/design-microservice/src/services/a2aService.js`
- **Method**: `routeTaskWithStreaming()`
- **Logic**:
  ```javascript
  async routeTaskWithStreaming(task, streamCallback) {
    // Step 1: CPU-based task analysis
    streamCallback({ type: 'progress', message: 'Analyzing task...' });
    
    const complexity = this.cpuModelRouter.analyzeComplexity(task);
    const selectedModel = this.cpuModelRouter.routeTask(task);
    
    streamCallback({ 
      type: 'model-selected', 
      model: selectedModel, 
      complexity 
    });
    
    // Step 2: Execute with appropriate model
    if (selectedModel.startsWith('cpu-')) {
      await this.executeCPUModel(task, streamCallback);
    } else {
      await this.executeA2AStreaming(task, streamCallback);
    }
  }
  ```
- **Acceptance**: Tasks route to CPU models first, LLM as fallback
- **Time**: 3 hours

**Task 1.3.3: Create Frontend SSE Hook**
- **Scope**: React hook for SSE consumption
- **Files**: `web/src/hooks/useSSEStreaming.ts`
- **Implementation**:
  ```typescript
  export function useSSEStreaming() {
    const [isStreaming, setIsStreaming] = useState(false);
    const [events, setEvents] = useState<StreamEvent[]>([]);
    
    const startStream = useCallback(async (task: any) => {
      const eventSource = new EventSource(
        `/api/stream/sse?clientId=${clientId}&task=${encodeURIComponent(JSON.stringify(task))}`
      );
      
      eventSource.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        setEvents(prev => [...prev, { type: 'progress', data }]);
      });
      
      eventSource.addEventListener('model-selected', (event) => {
        const data = JSON.parse(event.data);
        setEvents(prev => [...prev, { type: 'model-selected', data }]);
      });
      
      // ... other event handlers
    }, []);
    
    return { startStream, isStreaming, events };
  }
  ```
- **Acceptance**: Frontend can receive and display SSE events
- **Time**: 2 hours

---

## **📊 PHASE 2: INTELLIGENT AGENTS & MULTI-STEP WORKFLOWS**
### **Week 3-4: Advanced AI Capabilities**

#### **🤖 TASK GROUP 2.1: CPU-Based Agent Intelligence (Week 3, Days 1-3)**

**Task 2.1.1: Create Agent Skill Classifier (CPU-based)**
- **Scope**: Use DistilBERT for agent skill classification
- **Files**: `services/design-microservice/src/services/agentSkillClassifier.js`
- **Model**: DistilBERT (CPU-based)
- **Implementation**:
  ```javascript
  class AgentSkillClassifier {
    async classifyTaskSkills(taskContent) {
      const skills = [
        'architecture-design', 'database-design', 'api-design',
        'security-architecture', 'code-generation', 'deployment'
      ];
      
      // Use CPU-based DistilBERT classification
      const result = await this.cpuModelClient.callDistilBERT(taskContent, skills);
      
      return result.labels.filter(label => label.score > 0.7);
    }
  }
  ```
- **Acceptance**: Can classify task skills with 85%+ accuracy using CPU model
- **Time**: 4 hours

**Task 2.1.2: Implement Agent Selection Algorithm (Rule-based)**
- **Scope**: Fast agent selection without LLM
- **Files**: `services/design-microservice/src/services/agentSelector.js`
- **Logic**: Rule-based + CPU model scoring
- **Implementation**:
  ```javascript
  class AgentSelector {
    selectBestAgent(requiredSkills, taskComplexity) {
      // Rule-based selection (fast)
      let candidates = this.agents.filter(agent => 
        agent.skills.some(skill => requiredSkills.includes(skill))
      );
      
      // CPU-based scoring
      const scores = candidates.map(agent => ({
        agent,
        score: this.calculateAgentScore(agent, requiredSkills, taskComplexity)
      }));
      
      return scores.sort((a, b) => b.score - a.score)[0].agent;
    }
    
    calculateAgentScore(agent, skills, complexity) {
      // Fast calculation without LLM
      const skillMatch = skills.filter(s => agent.skills.includes(s)).length / skills.length;
      const complexityMatch = Math.abs(agent.complexity - complexity) < 0.3 ? 1 : 0.5;
      
      return skillMatch * 0.7 + complexityMatch * 0.3;
    }
  }
  ```
- **Acceptance**: Agent selection in <100ms with 90%+ accuracy
- **Time**: 2 hours

**Task 2.1.3: Create Multi-Agent Coordinator**
- **Scope**: Coordinate multiple agents without LLM overhead
- **Files**: `services/design-microservice/src/services/multiAgentCoordinator.js`
- **Strategy**: Rule-based coordination + CPU model validation
- **Implementation**:
  ```javascript
  class MultiAgentCoordinator {
    async coordinateAgents(task, selectedAgents) {
      const executionPlan = this.generateExecutionPlan(task, selectedAgents);
      
      for (const step of executionPlan) {
        // CPU-based step validation
        const isValid = await this.validateStep(step);
        if (!isValid) continue;
        
        // Execute step with appropriate agent
        await this.executeStep(step, streamCallback);
      }
    }
    
    generateExecutionPlan(task, agents) {
      // Rule-based plan generation (no LLM needed)
      const steps = [];
      
      if (task.type === 'architecture') {
        steps.push({ agent: 'arch-001', action: 'analyze', priority: 1 });
        steps.push({ agent: 'arch-001', action: 'design', priority: 2 });
        steps.push({ agent: 'db-001', action: 'schema', priority: 3 });
      }
      
      return steps.sort((a, b) => a.priority - b.priority);
    }
  }
  ```
- **Acceptance**: Multi-agent coordination working with rule-based planning
- **Time**: 3 hours

---

#### **🔄 TASK GROUP 2.2: CPU-Based Workflow Engine (Week 3, Days 4-7)**

**Task 2.2.1: Create Step Generator (FLAN-T5 based)**
- **Scope**: Use FLAN-T5 for step generation instead of expensive LLMs
- **Files**: `services/design-microservice/src/services/stepGenerator.js`
- **Model**: FLAN-T5 Small (CPU-based)
- **Implementation**:
  ```javascript
  class StepGenerator {
    async generateSteps(userRequest) {
      const prompt = `Break down this task into steps: ${userRequest}
      
      Format as JSON array:
      [{"step": 1, "action": "analyze", "agent": "arch", "description": "..."}]`;
      
      // Use CPU-based FLAN-T5 instead of expensive LLM
      const result = await this.cpuModelClient.callFlanT5(prompt, 256);
      
      return this.parseSteps(result.text);
    }
    
    parseSteps(text) {
      try {
        return JSON.parse(text);
      } catch (error) {
        // Fallback to rule-based parsing
        return this.parseStepsRuleBased(text);
      }
    }
  }
  ```
- **Acceptance**: Step generation using CPU model with 80%+ accuracy
- **Time**: 3 hours

**Task 2.2.2: Implement Progress Tracking (Rule-based)**
- **Scope**: Real-time progress without LLM overhead
- **Files**: `services/design-microservice/src/services/progressTracker.js`
- **Logic**: Mathematical progress calculation
- **Implementation**:
  ```javascript
  class ProgressTracker {
    calculateProgress(executionPlan, completedSteps) {
      const totalWeight = executionPlan.reduce((sum, step) => sum + step.weight, 0);
      const completedWeight = completedSteps.reduce((sum, step) => sum + step.weight, 0);
      
      return {
        overall: completedWeight / totalWeight,
        currentStep: this.getCurrentStepProgress(),
        estimatedCompletion: this.estimateCompletion(executionPlan, completedSteps)
      };
    }
    
    estimateCompletion(plan, completed) {
      const avgTimePerStep = completed.reduce((sum, step) => sum + step.duration, 0) / completed.length;
      const remainingSteps = plan.length - completed.length;
      
      return remainingSteps * avgTimePerStep;
    }
  }
  ```
- **Acceptance**: Accurate progress tracking in <10ms
- **Time**: 1 hour

**Task 2.2.3: Create Canvas Update Parser (CPU-based)**
- **Scope**: Parse canvas updates without LLM
- **Files**: `services/design-microservice/src/services/canvasUpdateParser.js`
- **Strategy**: JSON parsing + validation rules
- **Implementation**:
  ```javascript
  class CanvasUpdateParser {
    parseCanvasUpdate(artifactData) {
      try {
        const canvasData = JSON.parse(artifactData);
        
        // CPU-based validation
        const isValid = this.validateCanvasStructure(canvasData);
        if (!isValid) {
          return this.generateFallbackCanvas(artifactData);
        }
        
        return {
          nodes: canvasData.nodes || [],
          edges: canvasData.edges || [],
          metadata: canvasData.metadata || {}
        };
      } catch (error) {
        // Rule-based fallback parsing
        return this.parseCanvasRuleBased(artifactData);
      }
    }
    
    validateCanvasStructure(data) {
      // Fast validation without LLM
      return data.nodes && Array.isArray(data.nodes) &&
             data.edges && Array.isArray(data.edges);
    }
  }
  ```
- **Acceptance**: Canvas parsing with 95%+ accuracy, <50ms latency
- **Time**: 2 hours

---

## **💻 PHASE 3: CODE GENERATION & DEPLOYMENT**
### **Week 5-6: Production-Ready Code**

#### **⚡ TASK GROUP 3.1: CPU-Based Code Analysis (Week 5, Days 1-3)**

**Task 3.1.1: Create Code Structure Analyzer (Rule-based)**
- **Scope**: Analyze code requirements without LLM
- **Files**: `services/design-microservice/src/services/codeStructureAnalyzer.js`
- **Logic**: Pattern matching + rules
- **Implementation**:
  ```javascript
  class CodeStructureAnalyzer {
    analyzeCodeRequirements(architectureData) {
      const analysis = {
        languages: this.detectLanguages(architectureData),
        frameworks: this.detectFrameworks(architectureData),
        fileStructure: this.generateFileStructure(architectureData),
        dependencies: this.extractDependencies(architectureData)
      };
      
      return analysis;
    }
    
    detectLanguages(data) {
      const languages = [];
      
      // Rule-based detection
      if (data.nodes.some(n => n.type === 'react-component')) {
        languages.push('typescript', 'javascript');
      }
      if (data.nodes.some(n => n.type === 'api-service')) {
        languages.push('javascript', 'typescript');
      }
      if (data.nodes.some(n => n.type === 'database')) {
        languages.push('sql');
      }
      
      return languages;
    }
  }
  ```
- **Acceptance**: Code analysis in <200ms with 90%+ accuracy
- **Time**: 3 hours

**Task 3.1.2: Implement Template-Based Code Generation**
- **Scope**: Generate code using templates instead of LLM
- **Files**: `services/design-microservice/src/services/templateCodeGenerator.js`
- **Strategy**: Smart templates + variable substitution
- **Templates**: Store in `templates/` directory
- **Implementation**:
  ```javascript
  class TemplateCodeGenerator {
    async generateCode(codeSpec) {
      const files = [];
      
      for (const component of codeSpec.components) {
        const template = this.loadTemplate(component.type);
        const code = this.substituteVariables(template, component.props);
        
        files.push({
          filename: this.generateFilename(component),
          content: code,
          language: component.language
        });
      }
      
      return files;
    }
    
    loadTemplate(componentType) {
      // Load from templates directory
      const templatePath = `templates/${componentType}.template`;
      return fs.readFileSync(templatePath, 'utf8');
    }
    
    substituteVariables(template, variables) {
      let code = template;
      
      for (const [key, value] of Object.entries(variables)) {
        code = code.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      
      return code;
    }
  }
  ```
- **Acceptance**: Template-based code generation working for 5+ component types
- **Time**: 4 hours

**Task 3.1.3: Create Code Quality Validator (CPU-based)**
- **Scope**: Validate generated code without LLM
- **Files**: `services/design-microservice/src/services/codeQualityValidator.js`
- **Tools**: ESLint, Prettier, custom rules
- **Implementation**:
  ```javascript
  class CodeQualityValidator {
    async validateCode(generatedFiles) {
      const results = [];
      
      for (const file of generatedFiles) {
        const validation = {
          filename: file.filename,
          syntax: await this.validateSyntax(file.content, file.language),
          style: await this.validateStyle(file.content, file.language),
          security: await this.validateSecurity(file.content),
          performance: await this.validatePerformance(file.content)
        };
        
        results.push(validation);
      }
      
      return results;
    }
    
    async validateSyntax(code, language) {
      // Use appropriate parser for language
      try {
        if (language === 'javascript' || language === 'typescript') {
          require('@babel/parser').parse(code);
        }
        return { valid: true, errors: [] };
      } catch (error) {
        return { valid: false, errors: [error.message] };
      }
    }
  }
  ```
- **Acceptance**: Code validation with 95%+ accuracy, <500ms per file
- **Time**: 3 hours

---

#### **🚀 TASK GROUP 3.2: Smart Deployment (Week 5, Days 4-7)**

**Task 3.2.1: Create Deployment Config Generator (Template-based)**
- **Scope**: Generate deployment configs without LLM
- **Files**: `services/design-microservice/src/services/deploymentConfigGenerator.js`
- **Strategy**: Smart templates for Docker, K8s, etc.
- **Implementation**:
  ```javascript
  class DeploymentConfigGenerator {
    generateDeploymentConfigs(architecture, codeFiles) {
      const configs = [];
      
      // Generate Dockerfile for each service
      for (const service of architecture.services) {
        const dockerfile = this.generateDockerfile(service);
        configs.push({
          filename: `${service.name}/Dockerfile`,
          content: dockerfile,
          type: 'docker'
        });
      }
      
      // Generate docker-compose.yml
      const dockerCompose = this.generateDockerCompose(architecture.services);
      configs.push({
        filename: 'docker-compose.yml',
        content: dockerCompose,
        type: 'docker-compose'
      });
      
      return configs;
    }
    
    generateDockerfile(service) {
      const template = this.loadTemplate('dockerfile', service.language);
      return this.substituteVariables(template, {
        serviceName: service.name,
        port: service.port,
        dependencies: service.dependencies.join(' ')
      });
    }
  }
  ```
- **Acceptance**: Deployment configs generated for Docker, K8s, and cloud platforms
- **Time**: 4 hours

**Task 3.2.2: Implement Environment Config Generator**
- **Scope**: Generate environment configurations
- **Files**: `services/design-microservice/src/services/envConfigGenerator.js`
- **Logic**: Rule-based environment detection
- **Implementation**:
  ```javascript
  class EnvConfigGenerator {
    generateEnvironmentConfigs(architecture, deploymentTarget) {
      const configs = {
        development: this.generateDevConfig(architecture),
        staging: this.generateStagingConfig(architecture),
        production: this.generateProdConfig(architecture, deploymentTarget)
      };
      
      return configs;
    }
    
    generateDevConfig(architecture) {
      return {
        NODE_ENV: 'development',
        DATABASE_URL: 'mongodb://localhost:27017/dev',
        REDIS_URL: 'redis://localhost:6379',
        PORT: 3000
      };
    }
    
    generateProdConfig(architecture, target) {
      const config = {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 80
      };
      
      // Add target-specific configs
      if (target === 'gcp') {
        config.DATABASE_URL = '${DATABASE_URL}';
        config.REDIS_URL = '${REDIS_URL}';
      }
      
      return config;
    }
  }
  ```
- **Acceptance**: Environment configs for dev, staging, production
- **Time**: 2 hours

---

## **🎨 PHASE 4: UI/UX POLISH & PRODUCTION**
### **Week 7-8: Production-Ready Platform**

#### **✨ TASK GROUP 4.1: Streaming UI Components (Week 7, Days 1-4)**

**Task 4.1.1: Create Real-time Progress Components**
- **Scope**: UI components for streaming progress
- **Files**: `web/src/components/streaming/`
- **Components**:
  ```typescript
  // StreamingProgressBar.tsx
  export function StreamingProgressBar({ progress, currentStep, totalSteps }) {
    return (
      <div className="streaming-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="step-indicator">
          Step {currentStep} of {totalSteps}
        </div>
      </div>
    );
  }
  
  // StreamingMessage.tsx
  export function StreamingMessage({ message, isStreaming }) {
    return (
      <div className={`message ${isStreaming ? 'streaming' : ''}`}>
        {message}
        {isStreaming && <span className="cursor">|</span>}
      </div>
    );
  }
  ```
- **Acceptance**: Real-time progress visualization working
- **Time**: 3 hours

**Task 4.1.2: Implement Canvas Streaming Animations**
- **Scope**: Animate canvas updates as they stream
- **Files**: `web/src/components/canvas/StreamingCanvas.tsx`
- **Features**: Nodes appear with animation, edges draw progressively
- **Implementation**:
  ```typescript
  export function StreamingCanvas({ streamingNodes, streamingEdges }) {
    const [animatedNodes, setAnimatedNodes] = useState([]);
    const [animatedEdges, setAnimatedEdges] = useState([]);
    
    useEffect(() => {
      // Animate new nodes appearing
      streamingNodes.forEach((node, index) => {
        setTimeout(() => {
          setAnimatedNodes(prev => [...prev, node]);
        }, index * 200);
      });
    }, [streamingNodes]);
    
    return (
      <ReactFlow
        nodes={animatedNodes}
        edges={animatedEdges}
        // ... other props
      >
        <StreamingIndicator />
      </ReactFlow>
    );
  }
  ```
- **Acceptance**: Smooth canvas animations during streaming
- **Time**: 4 hours

**Task 4.1.3: Create Code Streaming Editor**
- **Scope**: Real-time code editor with streaming updates
- **Files**: `web/src/components/code/StreamingCodeEditor.tsx`
- **Features**: Files appear in tree, code types character by character
- **Implementation**:
  ```typescript
  export function StreamingCodeEditor({ streamingFiles }) {
    const [displayedFiles, setDisplayedFiles] = useState({});
    
    const typewriterEffect = useCallback((filename: string, content: string) => {
      let index = 0;
      const interval = setInterval(() => {
        setDisplayedFiles(prev => ({
          ...prev,
          [filename]: content.substring(0, index++)
        }));
        
        if (index > content.length) {
          clearInterval(interval);
        }
      }, 10);
    }, []);
    
    return (
      <div className="streaming-code-editor">
        <FileTree files={Object.keys(displayedFiles)} />
        <MonacoEditor
          value={displayedFiles[selectedFile] || ''}
          language="typescript"
          theme="vs-dark"
        />
      </div>
    );
  }
  ```
- **Acceptance**: Code streams with typewriter effect
- **Time**: 3 hours

---

#### **🏭 TASK GROUP 4.2: Production Infrastructure (Week 7-8)**

**Task 4.2.1: Setup Production Docker Configuration**
- **Scope**: Production-ready Docker setup
- **Files**: `docker-compose.prod.yml`
- **Configuration**:
  ```yaml
  version: '3.8'
  services:
    nginx:
      image: nginx:alpine
      ports: ["80:80", "443:443"]
      volumes:
        - ./nginx.conf:/etc/nginx/nginx.conf
        - ./ssl:/etc/ssl
    
    auth-service:
      image: youmeyou/auth:latest
      replicas: 2
      environment:
        - NODE_ENV=production
        - DATABASE_URL=${DATABASE_URL}
    
    design-service:
      image: youmeyou/design:latest
      replicas: 3
      environment:
        - NODE_ENV=production
        - A2A_BASE_URL=${A2A_BASE_URL}
    
    cpu-models:
      image: youmeyou/cpu-models:latest
      replicas: 2
      environment:
        - MODEL_CACHE_SIZE=1GB
  ```
- **Acceptance**: Production Docker setup working
- **Time**: 3 hours

**Task 4.2.2: Configure SSL and Domain**
- **Scope**: SSL certificates and domain configuration
- **Files**: `infrastructure/ssl/`, `nginx.conf`
- **Steps**:
  1. Configure Let's Encrypt certificates
  2. Setup NGINX SSL termination
  3. Configure domain DNS
  4. Test HTTPS access
- **Acceptance**: HTTPS working with valid certificates
- **Time**: 2 hours

**Task 4.2.3: Setup Monitoring and Logging**
- **Scope**: Production monitoring
- **Tools**: Sentry, New Relic, custom logging
- **Files**: `monitoring/docker-compose.yml`
- **Configuration**:
  ```yaml
  services:
    sentry:
      image: sentry:latest
      environment:
        - SENTRY_DSN=${SENTRY_DSN}
    
    prometheus:
      image: prom/prometheus
      ports: ["9090:9090"]
    
    grafana:
      image: grafana/grafana
      ports: ["3000:3000"]
  ```
- **Acceptance**: Monitoring dashboard showing system health
- **Time**: 4 hours

---

## **📊 COST OPTIMIZATION SUMMARY**

### **CPU Model Usage Distribution**
- **Task Analysis**: 100% CPU (DistilBERT)
- **Agent Selection**: 100% CPU (Rule-based)
- **Step Generation**: 100% CPU (FLAN-T5)
- **Code Structure**: 100% CPU (Rule-based)
- **Progress Tracking**: 100% CPU (Mathematical)
- **Canvas Parsing**: 100% CPU (JSON + Rules)
- **Config Generation**: 100% CPU (Templates)

### **LLM Usage (Only When Necessary)**
- **Complex Architecture Design**: 20% of requests
- **Advanced Code Generation**: 15% of requests  
- **Error Recovery**: 5% of requests
- **User Query Understanding**: 10% of requests

### **Expected Cost Reduction**
- **Before**: $0.30 per request average
- **After**: $0.03 per request average
- **Savings**: 90% cost reduction
- **Monthly**: $2,700 → $270 for 10K requests

---

## **🎯 EXECUTION PRIORITY**

### **High Priority (Must Complete)**
1. **A2A SDK Integration** (Task 1.1.x)
2. **CPU Model Setup** (Task 1.2.x)
3. **SSE Streaming** (Task 1.3.x)
4. **Agent Classification** (Task 2.1.1)
5. **Template Code Generation** (Task 3.1.2)

### **Medium Priority (Important)**
1. **Multi-Agent Coordination** (Task 2.1.3)
2. **Canvas Streaming** (Task 1.3.2)
3. **Code Quality Validation** (Task 3.1.3)
4. **Deployment Configs** (Task 3.2.1)

### **Low Priority (Nice to Have)**
1. **Advanced UI Animations** (Task 4.1.2)
2. **Monitoring Setup** (Task 4.2.3)
3. **Performance Optimization**

This granular breakdown ensures each task is isolated, testable, and focused on maximizing CPU model usage while minimizing expensive LLM calls! 