import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, TrendingUp, Target, Brain, Shield, BarChart3, Award, Sparkles, ArrowRight, Users, Star, X, Clock, Flame, Lock, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Landing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState('yearly');
  const [loading, setLoading] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated);
    document.documentElement.classList.add('dark');
  }, []);

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
    { icon: Brain, title: 'AI Trading Coach', description: 'Get proactive coaching based on YOUR patterns — catches mistakes before they cost you', gradient: 'from-cyan-500 to-blue-600' },
    { icon: TrendingUp, title: 'Live Market Cause Engine', description: 'Real-time macro scores, VIX, yield curves, COT data — know WHY markets move', gradient: 'from-purple-500 to-pink-600' },
    { icon: Award, title: 'Hybrid Score™', description: 'Patent-pending performance metric that tracks consistency, not just P&L', gradient: 'from-amber-500 to-orange-600' },
    { icon: Target, title: 'Risk Management Suite', description: 'Position sizer, prop firm rules, drawdown alerts — protect your account automatically', gradient: 'from-green-500 to-emerald-600' },
    { icon: BarChart3, title: 'Comprehensive Analytics', description: '40+ performance metrics including emotional pattern correlation and session analysis', gradient: 'from-indigo-500 to-violet-600' },
    { icon: Shield, title: 'Auto Broker Sync', description: 'MT4/MT5, cTrader, DXTrade, Tradovate, Kraken — trades sync while you sleep', gradient: 'from-red-500 to-rose-600' }
  ];

  const plans = [
    {
      name: 'Free',
      tier: 'free',
      price: { monthly: 0, yearly: 0 },
      perMonth: { monthly: 0, yearly: 0 },
      description: 'Dip your toes in',
      color: 'from-slate-400 to-slate-600',
      features: [
        { name: '1 Trading Account', included: true },
        { name: 'Manual Trade Logging', included: true },
        { name: 'Journal with AI Assistant', included: true },
        { name: 'Community Access', included: true },
        { name: 'Basic Analytics (View Only)', included: true },
        { name: 'AI Coach', included: false },
        { name: 'Broker Auto-Sync', included: false },
        { name: 'Webhooks & Signal Routing', included: false },
        { name: 'Market Cause Engine', included: false }
      ]
    },
    {
      name: 'Pro',
      tier: 'pro',
      price: { monthly: 29, yearly: 313 },
      perMonth: { monthly: 29, yearly: 26 },
      description: 'Everything serious traders need',
      color: 'from-cyan-500 to-purple-600',
      popular: true,
      badge: '🔥 Most Popular',
      yearSaving: 35,
      features: [
        { name: '3 Trading Accounts', included: true },
        { name: 'Full AI Coach (Unlimited)', included: true },
        { name: 'Market Cause Engine', included: true },
        { name: 'Auto Broker Sync (MT4/5, DXTrade, more)', included: true },
        { name: 'Webhook Integration & API Access', included: true },
        { name: 'Signal Routing & Execution', included: true },
        { name: 'Advanced Analytics + SEC Filings AI', included: true },
        { name: 'Export Features (PDF, CSV)', included: true },
        { name: 'Trade Templates & Automation', included: true },
        { name: 'Custom Audio Alerts', included: true }
      ]
    },
    {
      name: 'Team',
      tier: 'team',
      price: { monthly: 49, yearly: 529 },
      perMonth: { monthly: 49, yearly: 44 },
      description: 'For pros, mentors & funded traders',
      color: 'from-purple-500 to-pink-600',
      yearSaving: 59,
      features: [
        { name: 'Unlimited Trading Accounts', included: true },
        { name: 'Everything in Pro', included: true },
        { name: 'Shared Access (Mentors/Teams)', included: true },
        { name: 'Advanced Backtesting Engine', included: true },
        { name: 'Team Collaboration Tools', included: true },
        { name: 'Unlimited AI Assistance', included: true },
        { name: 'Priority AI Responses', included: true },
        { name: 'Broker Sync Automation', included: true },
        { name: 'Premium Support', included: true }
      ]
    }
  ];

  const testimonials = [
    { name: 'Marcus T.', role: 'Funded Day Trader', result: '+23% Win Rate', text: 'The AI Coach identified I was revenge trading after lunch. Fixed it in 2 weeks. Win rate went from 44% to 67%.', stars: 5, avatar: 'M' },
    { name: 'Sarah L.', role: 'Forex Trader', result: 'Passed $200K Challenge', text: 'Used the Hybrid Score to stay consistent. Finally passed my prop firm challenge on the first try after 3 failed attempts.', stars: 5, avatar: 'S' },
    { name: 'David K.', role: 'NQ Futures Trader', result: '$3,400 saved in losses', text: 'The Market Cause Engine warned me about the FOMC setup. Sat out a day I would have blown up on. Best tool I\'ve ever used.', stars: 5, avatar: 'D' }
  ];

  const faqs = [
    { q: 'Do I need a credit card to start?', a: 'No. The Free plan requires zero payment info. Upgrade only when you\'re ready.' },
    { q: 'Can I cancel anytime?', a: 'Yes. Cancel with one click from your profile. No questions asked, no penalties.' },
    { q: 'Does it work with my broker?', a: 'We support MT4, MT5, cTrader, DXTrade, Tradovate, Rithmic, Kraken, Binance, and NinjaTrader (via statement import). Manual CSV import works for everything else.' },
    { q: 'What is the Hybrid Score™?', a: 'It\'s a patent-pending composite score that measures trading consistency across win rate, risk management, rule adherence, and emotional discipline — not just P&L.' },
    { q: 'Is there a yearly discount?', a: 'Yes! Paying yearly saves you $35/year on Pro and $59/year on Team. That\'s like getting more than a month free.' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Announcement Bar */}
      <div className="bg-gradient-to-r from-cyan-600 to-purple-700 text-white text-center text-sm py-2 px-4">
        <Flame className="inline h-4 w-4 mr-1 text-yellow-300" />
        <strong>Limited Offer:</strong> Lock in yearly pricing before rates increase — saves you up to $59/year
        <Flame className="inline h-4 w-4 ml-1 text-yellow-300" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 w-full z-50 backdrop-blur-xl border-b bg-slate-950/90 border-cyan-500/20">
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
                <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => base44.auth.redirectToLogin(createPageUrl('Dashboard'))}>Sign In</Button>
                <Button
                  onClick={() => base44.auth.redirectToLogin(createPageUrl('Dashboard'))}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
                >
                  Start Free →
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-20 px-6 bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto text-center relative">
          <Badge className="mb-6 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 text-cyan-300 px-4 py-2 text-sm">
            <Sparkles className="h-4 w-4 mr-2 inline" />
            Used by 10,000+ Traders in 40+ Countries
          </Badge>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            Stop Losing Trades
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              You Should Have Won
            </span>
          </h1>

          <p className="text-xl md:text-2xl mb-4 max-w-3xl mx-auto text-slate-300">
            Hybrid Journal combines <strong className="text-cyan-400">AI coaching</strong>, <strong className="text-purple-400">live market intelligence</strong>, and <strong className="text-pink-400">broker auto-sync</strong> to turn your losing patterns into winning ones — fast.
          </p>

          <p className="text-slate-400 mb-10 text-lg">
            The average trader who uses Hybrid Journal improves their win rate by <span className="text-green-400 font-bold">18–27%</span> within 90 days.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              onClick={() => base44.auth.redirectToLogin(createPageUrl('Dashboard'))}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-lg px-10 py-6 shadow-2xl shadow-cyan-500/30"
            >
              Start Free — No Card Needed
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
              className="text-lg px-10 py-6 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              See Pricing
            </Button>
          </div>

          {/* Social proof bar */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400 text-sm">
            {[
              { icon: Users, text: '10,000+ Active Traders' },
              { icon: Star, text: '4.9/5 Rating', extra: 'text-yellow-400' },
              { icon: Lock, text: 'Bank-Level Security' },
              { icon: Clock, text: '14-Day Free Trial' }
            ].map(({ icon: Icon, text, extra }, i) => (
              <div key={i} className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${extra || 'text-cyan-500'}`} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              One Platform. Every Edge You Need.
            </h2>
            <p className="text-xl text-slate-400">
              Built by traders, for traders. Every feature solves a real problem.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="group relative bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <Badge className="mb-4 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-4 py-1.5">
              <Flame className="h-4 w-4 mr-1 inline text-amber-400" />
              Yearly plans save you up to $59 — lock in before price increase
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Invest in Your Trading
            </h2>
            <p className="text-xl text-slate-400 mb-10">
              One winning trade can pay for a year of Pro. Choose your plan.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 bg-slate-900 border border-slate-700 rounded-2xl p-2 mb-4">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  billingPeriod === 'yearly'
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Yearly
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">SAVE 10%</span>
              </button>
            </div>

            {billingPeriod === 'yearly' && (
              <p className="text-green-400 text-sm font-medium">
                ✓ You're saving up to $59 by paying yearly
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-10 items-stretch">
            {plans.map((plan) => {
              const price = plan.price[billingPeriod];
              const perMonth = plan.perMonth[billingPeriod];

              return (
                <div
                  key={plan.tier}
                  className={`relative flex flex-col rounded-3xl transition-all ${
                    plan.popular
                      ? 'ring-2 ring-cyan-500 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-cyan-500/20 scale-105'
                      : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                      <div className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg shadow-cyan-500/40 flex items-center gap-2">
                        <Flame className="h-4 w-4 text-yellow-300" />
                        MOST POPULAR CHOICE
                      </div>
                    </div>
                  )}

                  <div className={`p-8 ${plan.popular ? 'pt-12' : ''}`}>
                    {/* Plan name + badge */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                      {plan.popular && (
                        <Badge className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs">Recommended</Badge>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

                    {/* Price display */}
                    <div className="mb-6">
                      {price === 0 ? (
                        <div className="flex items-end gap-1">
                          <span className="text-5xl font-extrabold text-white">Free</span>
                          <span className="text-slate-400 mb-2 text-sm">forever</span>
                        </div>
                      ) : billingPeriod === 'yearly' ? (
                        <div>
                          <div className="flex items-end gap-2">
                            <span className={`text-5xl font-extrabold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                              ${perMonth}
                            </span>
                            <span className="text-slate-400 mb-2 text-sm">/month</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-500 line-through text-sm">${plan.perMonth.monthly}/mo</span>
                            <Badge className="bg-green-500/20 border border-green-500/30 text-green-400 text-xs">
                              Save ${plan.yearSaving}/year
                            </Badge>
                          </div>
                          <p className="text-slate-500 text-xs mt-1">Billed as ${price}/year</p>
                        </div>
                      ) : (
                        <div className="flex items-end gap-1">
                          <span className={`text-5xl font-extrabold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                            ${price}
                          </span>
                          <span className="text-slate-400 mb-2 text-sm">/month</span>
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    {plan.tier === 'free' ? (
                      <Button
                        onClick={() => base44.auth.redirectToLogin(createPageUrl('Dashboard'))}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white py-6 text-base font-semibold rounded-xl"
                      >
                        Get Started Free
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSubscribe(plan.tier)}
                        disabled={loading === plan.tier}
                        className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white py-6 text-base font-bold rounded-xl shadow-lg transition-all ${plan.popular ? 'shadow-cyan-500/30' : ''}`}
                      >
                        {loading === plan.tier ? 'Loading...' : plan.popular ? `Get Pro ${billingPeriod === 'yearly' ? '— Best Value' : 'Now'}` : `Upgrade to ${plan.name}`}
                      </Button>
                    )}

                    {plan.popular && (
                      <p className="text-center text-xs text-slate-500 mt-3">
                        ✓ 14-day trial · ✓ Cancel anytime · ✓ No hidden fees
                      </p>
                    )}
                  </div>

                  {/* Features list */}
                  <div className={`px-8 pb-8 flex-1 ${plan.popular ? 'border-t border-cyan-500/20 pt-6' : 'border-t border-slate-800 pt-6'}`}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                      {plan.tier === 'free' ? 'Included:' : plan.tier === 'pro' ? 'Everything you need:' : 'Full suite:'}
                    </p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          {feature.included ? (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.popular ? 'bg-cyan-500/20' : 'bg-green-500/20'}`}>
                              <Check className={`h-3 w-3 ${plan.popular ? 'text-cyan-400' : 'text-green-400'}`} />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-slate-800">
                              <X className="h-3 w-3 text-slate-600" />
                            </div>
                          )}
                          <span className={`text-sm ${
                            feature.included
                              ? 'text-slate-200'
                              : 'text-slate-600'
                          }`}>
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-slate-500 text-sm mt-10">
            All plans include access to Hybrid Funding opportunities · Secure payment via Stripe
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Real Traders. Real Results.
            </h2>
            <p className="text-slate-400 text-xl">Not marketing fluff — actual outcomes from our community</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-all">
                <div className="flex mb-4">
                  {[...Array(testimonial.stars)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <Badge className="mb-4 bg-green-500/20 border border-green-500/30 text-green-400">
                  {testimonial.result}
                </Badge>
                <p className="text-slate-300 mb-6 text-sm leading-relaxed">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{testimonial.name}</p>
                    <p className="text-slate-500 text-xs">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-slate-950">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-white">Common Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-slate-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-white font-medium hover:bg-slate-900 transition-colors"
                >
                  {faq.q}
                  <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed bg-slate-900/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-cyan-950/50 via-purple-950/50 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Badge className="mb-6 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-4 py-2">
            <Flame className="h-4 w-4 mr-2 inline text-amber-400" />
            Yearly pricing saves you $35–$59 — limited time offer
          </Badge>
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 text-white leading-tight">
            Your Next Losing Trade
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Could Be Your Last
            </span>
          </h2>
          <p className="text-xl mb-10 text-slate-300 max-w-2xl mx-auto">
            Join 10,000+ traders using Hybrid Journal to build consistency, protect their capital, and finally become profitable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => base44.auth.redirectToLogin(createPageUrl('Dashboard'))}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-lg px-12 py-7 shadow-2xl shadow-cyan-500/40 font-bold"
            >
              Start Free Trial Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
              className="text-lg px-12 py-7 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              View Plans
            </Button>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            No credit card required · Cancel anytime · 14-day free trial on Pro
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t bg-slate-950 border-slate-800 text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Hybrid Journal
            </span>
          </div>
          <div className="text-center text-sm">
            <p>© 2025 Hybrid Journal. All rights reserved.</p>
            <p className="text-xs mt-1 text-slate-600">Patent Pending · Hybrid Score™ Technology</p>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}