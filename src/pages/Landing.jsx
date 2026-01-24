import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, TrendingUp, Target, Brain, Shield, BarChart3, Award, Sparkles, ArrowRight, Users, Star, X, BookOpen } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Landing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleSubscribe = async (tier) => {
    setLoading(tier);
    try {
      const response = await base44.functions.invoke('createCheckoutSession', {
        tier,
        billing_period: billingPeriod
      });
      window.location.href = response.data.url;
    } catch (error) {
      alert('Failed to create checkout session');
      setLoading(null);
    }
  };

  const features = [
    { icon: Brain, title: 'AI-Powered Analysis', description: 'Get intelligent insights from your trading patterns with our advanced AI coach' },
    { icon: TrendingUp, title: 'Live Market Data', description: 'Real-time charts, heatmaps, and TradingView integration for all markets' },
    { icon: Award, title: 'Hybrid Score™', description: 'Patent-pending performance tracking system to accelerate your growth' },
    { icon: Target, title: 'Risk Management', description: 'Advanced position sizing and portfolio risk calculators' },
    { icon: BarChart3, title: 'Advanced Analytics', description: 'Comprehensive performance metrics and emotional pattern tracking' },
    { icon: Shield, title: 'Broker Sync', description: 'Automatic trade syncing with MT4, MT5, cTrader, and more' }
  ];

  const plans = [
    {
      name: 'Free',
      tier: 'free',
      price: { monthly: 0, yearly: 0 },
      description: 'Perfect for getting started',
      color: 'from-slate-400 to-slate-600',
      features: [
        { name: '1 Trading Account', included: true },
        { name: 'Manual Trade Logging', included: true },
        { name: 'Journal with AI Assistant', included: true },
        { name: 'Community Access', included: true },
        { name: 'Funding Opportunities', included: true },
        { name: 'Basic Analytics (View Only)', included: true },
        { name: 'AI Coach', included: false },
        { name: 'Webhooks & API', included: false },
        { name: 'Signal Routing', included: false }
      ]
    },
    {
      name: 'Pro',
      tier: 'pro',
      price: { monthly: 29, yearly: 313 },
      description: 'For serious individual traders',
      color: 'from-cyan-500 to-purple-600',
      popular: true,
      features: [
        { name: '3 Trading Accounts', included: true },
        { name: 'Full AI Coach Conversations', included: true },
        { name: 'Webhook Integration', included: true },
        { name: 'API Access', included: true },
        { name: 'Signal Routing & Execution', included: true },
        { name: 'Advanced Analytics & Insights', included: true },
        { name: 'Export Features (PDF, CSV)', included: true },
        { name: 'Custom Audio Alerts', included: true },
        { name: 'All Dashboard Widgets', included: true },
        { name: 'Trade Templates & Automation', included: true }
      ]
    },
    {
      name: 'Team',
      tier: 'team',
      price: { monthly: 49, yearly: 529 },
      description: 'For professional traders & teams',
      color: 'from-purple-500 to-pink-600',
      features: [
        { name: 'Unlimited Trading Accounts', included: true },
        { name: 'Everything in Pro', included: true },
        { name: 'Shared Access (Mentors/Teams)', included: true },
        { name: 'Unlimited AI Assistance', included: true },
        { name: 'Priority AI Responses', included: true },
        { name: 'Advanced Backtesting', included: true },
        { name: 'Broker Sync Automation', included: true },
        { name: 'Team Collaboration', included: true },
        { name: 'Premium Support', included: true }
      ]
    }
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
                <Button variant="ghost" onClick={() => base44.auth.redirectToLogin(createPageUrl('Dashboard'))}>Sign In</Button>
                <Button 
                  onClick={() => base44.auth.redirectToLogin(createPageUrl('Dashboard'))}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
                >
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
            <Button 
              size="lg" 
              onClick={() => base44.auth.redirectToLogin(createPageUrl('Dashboard'))}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-lg px-8 py-6"
            >
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
              Start free, upgrade when you're ready to unlock powerful features
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const Icon = plan.tier === 'free' ? Zap : plan.tier === 'pro' ? TrendingUp : Users;
              const price = plan.price[billingPeriod];

              return (
                <Card
                  key={plan.tier}
                  className={`relative backdrop-blur-xl transition-all ${
                    plan.popular 
                      ? `ring-2 ring-cyan-500 ${darkMode ? 'bg-slate-950/90' : 'bg-white/90'} transform scale-105` 
                      : darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'
                  } hover:shadow-2xl hover:scale-110`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-4 py-1">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className={`text-center pb-8 ${plan.popular ? 'pt-8' : ''}`}>
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className={`text-2xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {plan.name}
                    </CardTitle>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'} mt-2`}>
                      {plan.description}
                    </p>
                    <div className="mt-6">
                      <span className={`text-5xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                        ${price}
                      </span>
                      {price > 0 && (
                        <>
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            /{billingPeriod === 'monthly' ? 'month' : 'year'}
                          </span>
                          {billingPeriod === 'yearly' && (
                            <div className="text-xs text-green-500 mt-2">Save 10%</div>
                          )}
                        </>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-3 min-h-[300px]">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          {feature.included ? (
                            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <span className={`text-sm ${
                            feature.included 
                              ? (darkMode ? 'text-white' : 'text-slate-900')
                              : (darkMode ? 'text-slate-500' : 'text-slate-400')
                          }`}>
                            {feature.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4">
                      {plan.tier === 'free' ? (
                        <Button
                          onClick={() => base44.auth.redirectToLogin(createPageUrl('Dashboard'))}
                          className="w-full bg-gradient-to-r from-slate-400 to-slate-600"
                        >
                          Get Started Free
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSubscribe(plan.tier)}
                          disabled={loading === plan.tier}
                          className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white shadow-lg`}
                        >
                          {loading === plan.tier ? 'Loading...' : `Upgrade to ${plan.name}`}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className={`mt-12 text-center ${darkMode ? 'text-slate-400' : 'text-slate-600'} text-sm`}>
            <p>All plans include access to Hybrid Funding opportunities</p>
            <p className="mt-2">Cancel anytime • Secure payment via Stripe • 24/7 Support</p>
          </div>
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
          <Button 
            size="lg" 
            onClick={() => base44.auth.redirectToLogin(createPageUrl('Dashboard'))}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-lg px-12 py-6"
          >
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