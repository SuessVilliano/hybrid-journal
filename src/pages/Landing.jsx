import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, TrendingUp, Target, Brain, Shield, BarChart3, Award, Sparkles, ArrowRight, Users, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Landing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const features = [
    { icon: Brain, title: 'AI-Powered Analysis', description: 'Get intelligent insights from your trading patterns with our advanced AI coach' },
    { icon: TrendingUp, title: 'Live Market Data', description: 'Real-time charts, heatmaps, and TradingView integration for all markets' },
    { icon: Award, title: 'Hybrid Score™', description: 'Patent-pending performance tracking system to accelerate your growth' },
    { icon: Target, title: 'Risk Management', description: 'Advanced position sizing and portfolio risk calculators' },
    { icon: BarChart3, title: 'Advanced Analytics', description: 'Comprehensive performance metrics and emotional pattern tracking' },
    { icon: Shield, title: 'Broker Sync', description: 'Automatic trade syncing with MT4, MT5, cTrader, and more' }
  ];

  const testimonials = [
    { name: 'Marcus T.', role: 'Day Trader', text: 'Hybrid Journal helped me identify my emotional patterns and improve my win rate by 23% in 3 months!', stars: 5 },
    { name: 'Sarah L.', role: 'Forex Trader', text: 'The AI insights are incredible. It\'s like having a trading mentor 24/7. Worth every penny.', stars: 5 },
    { name: 'David K.', role: 'Prop Trader', text: 'Finally passed my funded account challenge after using the Hybrid Score to focus on consistency.', stars: 5 }
  ];

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 backdrop-blur-xl border-b ${
        darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Hybrid Journal
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link to={createPageUrl('Dashboard')}>
                <Button className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Button variant="ghost" onClick={() => base44.auth.redirectToLogin()}>Sign In</Button>
                <Button className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
                  Start Free Trial
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`pt-32 pb-20 px-6 ${darkMode ? 'bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950' : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'}`}>
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-6 bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-4 py-2">
            <Sparkles className="h-4 w-4 mr-2 inline" />
            Patent-Pending Hybrid Score™ Technology
          </Badge>
          
          <h1 className={`text-5xl md:text-7xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Master Trading
            </span>
            <br />
            With AI-Powered Insights
          </h1>
          
          <p className={`text-xl md:text-2xl mb-8 max-w-3xl mx-auto ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Track, analyze, and improve your trading performance with the world's most advanced trading journal. 
            Built for serious traders who want to go pro.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-lg px-8 py-6">
              Start 14-Day Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className={`text-lg px-8 py-6 ${darkMode ? 'border-cyan-500/30 text-cyan-400' : 'border-cyan-500/30 text-cyan-700'}`}>
              Watch Demo
            </Button>
          </div>

          <div className={`flex flex-wrap items-center justify-center gap-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>10,000+ Active Traders</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span>4.9/5 Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>Bank-Level Security</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className={`py-20 px-6 ${darkMode ? 'bg-slate-900/50' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Everything You Need to Succeed
            </h2>
            <p className={`text-xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Professional-grade tools used by funded traders worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <Card key={idx} className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'} hover:scale-105 transition-transform`}>
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                    darkMode ? 'bg-cyan-500/10' : 'bg-cyan-100'
                  }`}>
                    <feature.icon className={`h-6 w-6 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  </div>
                  <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className={`py-20 px-6 ${darkMode ? 'bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950' : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Simple, Transparent Pricing
            </h2>
            <p className={`text-xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Choose the plan that works for you. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Monthly Plan */}
            <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'} relative`}>
              <CardHeader>
                <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>Monthly</CardTitle>
                <div className="mt-4">
                  <span className={`text-5xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>$29</span>
                  <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>/month</span>
                </div>
                <p className={`mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Perfect for getting started
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
                  Start Free Trial
                </Button>
                <ul className="space-y-3">
                  {[
                    'Unlimited trade tracking',
                    'AI-powered analysis',
                    'Live market data & charts',
                    'Hybrid Score™ tracking',
                    'Risk management tools',
                    'Broker sync (MT4/MT5)',
                    'Mobile & desktop access',
                    'Email support'
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                      <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Yearly Plan */}
            <Card className="bg-gradient-to-br from-cyan-500 to-purple-600 border-0 relative shadow-2xl shadow-cyan-500/20 transform scale-105">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-yellow-900 px-4 py-1">
                SAVE 34%
              </Badge>
              <CardHeader>
                <CardTitle className="text-white">Yearly</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-white">$19</span>
                  <span className="text-cyan-100">/month</span>
                </div>
                <p className="mt-2 text-cyan-100">
                  Billed $228 annually
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full bg-white text-purple-600 hover:bg-cyan-50 font-bold">
                  Start Free Trial
                </Button>
                <ul className="space-y-3">
                  {[
                    'Everything in Monthly',
                    'Priority support',
                    'Advanced AI insights',
                    'Custom strategies',
                    'Export to PDF/CSV',
                    'API access',
                    'Early access to features',
                    '2 months FREE'
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-white" />
                      <span className="text-white font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <p className={`text-center mt-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            🎉 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className={`py-20 px-6 ${darkMode ? 'bg-slate-900/50' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Trusted by Traders Worldwide
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.stars)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className={`mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>"{testimonial.text}"</p>
                  <div>
                    <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{testimonial.name}</p>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 px-6 ${darkMode ? 'bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950' : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Ready to Transform Your Trading?
          </h2>
          <p className={`text-xl mb-8 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Join thousands of successful traders who are already using Hybrid Journal to reach their goals faster.
          </p>
          <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-lg px-12 py-6">
            Start Your Free Trial Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className={`mt-4 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 px-6 border-t ${darkMode ? 'bg-slate-950 border-cyan-500/20 text-slate-400' : 'bg-white border-cyan-500/30 text-slate-600'}`}>
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Hybrid Journal
            </span>
          </div>
          <p className="text-sm">© 2025 Hybrid Journal. All rights reserved.</p>
          <p className="text-xs mt-2">Patent Pending • Hybrid Score™ Technology</p>
        </div>
      </footer>
    </div>
  );
}