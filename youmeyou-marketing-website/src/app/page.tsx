export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              YouMeYou AI
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-white/80 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-white/80 hover:text-white transition-colors">Pricing</a>
              <a href="#demo" className="text-white/80 hover:text-white transition-colors">Demo</a>
            </div>
            <div className="flex space-x-4">
              <a 
                href="https://app.youmeyou.ai/login" 
                className="text-white/80 hover:text-white transition-colors"
              >
                Login
              </a>
              <a 
                href="https://app.youmeyou.ai/signup" 
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-8">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Revolutionary AI
            </span>
            <br />
            <span className="text-white">Development Platform</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto">
            Transform your ideas into reality with YouMeYou AI. Our intelligent agents collaborate to design, 
            develop, and deploy your projects faster than ever before.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="https://app.youmeyou.ai/signup" 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              Start Building Now
            </a>
            <a 
              href="#demo" 
              className="border border-white/20 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/5 transition-all"
            >
              Watch Demo
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-cyan-400 mb-2">90%</div>
              <div className="text-white/60">Faster Development</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">70%</div>
              <div className="text-white/60">Cost Reduction</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">24/7</div>
              <div className="text-white/60">AI Collaboration</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">100+</div>
              <div className="text-white/60">Projects Completed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Intelligent AI Agents
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Our specialized AI agents work together to handle every aspect of your project
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 p-8 rounded-2xl border border-white/10">
              <div className="w-12 h-12 bg-blue-500 rounded-lg mb-6 flex items-center justify-center">
                <span className="text-white font-bold">PM</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Project Manager</h3>
              <p className="text-white/70 mb-6">
                Plans, coordinates, and manages your entire project timeline with intelligent resource allocation.
              </p>
              <ul className="space-y-2 text-white/60">
                <li>• Timeline optimization</li>
                <li>• Resource allocation</li>
                <li>• Risk assessment</li>
                <li>• Progress tracking</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 p-8 rounded-2xl border border-white/10">
              <div className="w-12 h-12 bg-purple-500 rounded-lg mb-6 flex items-center justify-center">
                <span className="text-white font-bold">SA</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">System Architect</h3>
              <p className="text-white/70 mb-6">
                Designs scalable, maintainable system architecture with best practices and modern patterns.
              </p>
              <ul className="space-y-2 text-white/60">
                <li>• System design</li>
                <li>• Scalability planning</li>
                <li>• Technology selection</li>
                <li>• Security implementation</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 p-8 rounded-2xl border border-white/10">
              <div className="w-12 h-12 bg-cyan-500 rounded-lg mb-6 flex items-center justify-center">
                <span className="text-white font-bold">CG</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Code Generator</h3>
              <p className="text-white/70 mb-6">
                Generates clean, production-ready code with comprehensive testing and documentation.
              </p>
              <ul className="space-y-2 text-white/60">
                <li>• Clean code generation</li>
                <li>• Testing implementation</li>
                <li>• Documentation</li>
                <li>• Performance optimization</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-white/80">
              Choose the plan that fits your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 p-8 rounded-2xl border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-4">Starter</h3>
              <div className="text-4xl font-bold text-white mb-6">
                $29<span className="text-lg text-white/60">/month</span>
              </div>
              <ul className="space-y-3 text-white/70 mb-8">
                <li>• 5 projects per month</li>
                <li>• Basic AI agents</li>
                <li>• Email support</li>
                <li>• Community access</li>
              </ul>
              <a 
                href="https://app.youmeyou.ai/signup?plan=starter" 
                className="block w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-center py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Get Started
              </a>
            </div>

            <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 p-8 rounded-2xl border border-blue-500/50 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Professional</h3>
              <div className="text-4xl font-bold text-white mb-6">
                $99<span className="text-lg text-white/60">/month</span>
              </div>
              <ul className="space-y-3 text-white/70 mb-8">
                <li>• Unlimited projects</li>
                <li>• All AI agents</li>
                <li>• Priority support</li>
                <li>• Advanced features</li>
                <li>• Team collaboration</li>
              </ul>
              <a 
                href="https://app.youmeyou.ai/signup?plan=professional" 
                className="block w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Start Free Trial
              </a>
            </div>

            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 p-8 rounded-2xl border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-4">Enterprise</h3>
              <div className="text-4xl font-bold text-white mb-6">
                Custom
              </div>
              <ul className="space-y-3 text-white/70 mb-8">
                <li>• Custom solutions</li>
                <li>• Dedicated support</li>
                <li>• On-premise deployment</li>
                <li>• SLA guarantees</li>
                <li>• Custom integrations</li>
              </ul>
              <a 
                href="mailto:enterprise@youmeyou.ai" 
                className="block w-full border border-white/20 text-white text-center py-3 rounded-lg font-semibold hover:bg-white/5 transition-all"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Development?
          </h2>
          <p className="text-xl text-white/80 mb-12">
            Join thousands of developers who are building faster with AI
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="https://app.youmeyou.ai/signup" 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              Start Your Free Trial
            </a>
            <a 
              href="mailto:hello@youmeyou.ai" 
              className="border border-white/20 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/5 transition-all"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-black/40 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                YouMeYou AI
              </div>
              <p className="text-white/60">
                Revolutionary AI-powered development platform transforming how we build software.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-white/60">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#demo" className="hover:text-white transition-colors">Demo</a></li>
                <li><a href="/docs" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-white/60">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-white/60">
                <li><a href="/help" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="/community" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="/status" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="mailto:support@youmeyou.ai" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-white/60">
            <p>&copy; 2024 YouMeYou AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 