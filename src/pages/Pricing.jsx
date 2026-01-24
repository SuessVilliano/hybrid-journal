import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Zap, TrendingUp, Users, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { createPageUrl } from '../utils';

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [loading, setLoading] = useState(null);
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

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

  const plans = [
    {
      name: 'Free',
      tier: 'free',
      price: { monthly: 0, yearly: 0 },
      description: 'Perfect for getting started',
      icon: Zap,
      color: 'from-slate-400 to-slate-600',
      features: [
        { name: '1 Trading Account', included: true },
        { name: 'Manual Trade Logging', included: true },
        { name: 'Journal with AI Assistant', included: true },
        { name: 'Community Access', included: true },
        { name: 'Funding Opportunities', included: true },
        { name: 'Basic Analytics (View Only)', included: true },
        { name: 'View Signals (Read-Only)', included: true },
        { name: 'Limited Dashboard Widgets', included: true },
        { name: 'AI Coach', included: false },
        { name: 'Webhooks & API', included: false },
        { name: 'Signal Routing', included: false },
        { name: 'Advanced Features', included: false }
      ]
    },
    {
      name: 'Pro',
      tier: 'pro',
      price: { monthly: 29, yearly: 313 },
      description: 'For serious individual traders',
      icon: TrendingUp,
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
        { name: 'Trade Templates & Automation', included: true },
        { name: 'Daily/Weekly/Monthly Planning', included: true },
        { name: 'Team Access', included: false }
      ]
    },
    {
      name: 'Team',
      tier: 'team',
      price: { monthly: 49, yearly: 529 },
      description: 'For professional traders & teams',
      icon: Users,
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
        { name: 'White-Label Options', included: true },
        { name: 'Custom Integrations', included: true },
        { name: 'Premium Support', included: true }
      ]
    }
  ];

  return (
    <div className={`min-h-screen p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className={`text-5xl font-bold mb-4 bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            Choose Your Plan
          </h1>
          <p className={`text-lg mb-8 ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
            Unlock the full potential of AI-powered trading
          </p>

          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm ${billingPeriod === 'monthly' ? (darkMode ? 'text-white' : 'text-slate-900') : (darkMode ? 'text-slate-400' : 'text-slate-600')}`}>
              Monthly
            </span>
            <Switch
              checked={billingPeriod === 'yearly'}
              onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
            />
            <span className={`text-sm ${billingPeriod === 'yearly' ? (darkMode ? 'text-white' : 'text-slate-900') : (darkMode ? 'text-slate-400' : 'text-slate-600')}`}>
              Yearly
            </span>
            {billingPeriod === 'yearly' && (
              <Badge className="bg-green-500">Save 10%</Badge>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = plan.price[billingPeriod];
            const isCurrentPlan = user?.subscription_tier === plan.tier;

            return (
              <Card
                key={plan.tier}
                className={`relative backdrop-blur-xl transition-all ${
                  plan.popular 
                    ? `ring-2 ring-cyan-500 ${darkMode ? 'bg-slate-950/90' : 'bg-white/90'}` 
                    : darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'
                } hover:shadow-2xl hover:scale-105`}
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
                  <CardDescription className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                    {plan.description}
                  </CardDescription>
                  <div className="mt-6">
                    <span className={`text-5xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                      ${price}
                    </span>
                    {price > 0 && (
                      <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        /{billingPeriod === 'monthly' ? 'month' : 'year'}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
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
                        className="w-full bg-gradient-to-r from-slate-400 to-slate-600"
                        disabled
                      >
                        Current Plan
                      </Button>
                    ) : isCurrentPlan ? (
                      <Button
                        className="w-full bg-green-500"
                        disabled
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Current Plan
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
    </div>
  );
}