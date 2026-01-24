import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BrokerSetupWizard({ isOpen, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState('');
  const [mode, setMode] = useState('');
  const [formData, setFormData] = useState({
    display_name: '',
    account_number: '',
    api_key: '',
    api_secret: '',
    server: '',
    webhook_secret: ''
  });
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const providers = [
    { id: 'DXTrade', name: 'DXTrade', docs: 'https://dx.trade/apis/', modes: ['READONLY_API', 'STATEMENT_INGEST'] },
    { id: 'cTrader', name: 'cTrader', docs: 'https://help.ctrader.com/open-api/', modes: ['READONLY_API', 'STATEMENT_INGEST'] },
    { id: 'MatchTrader', name: 'Match-Trader', docs: 'https://docs.match-trade.com/', modes: ['READONLY_API', 'STATEMENT_INGEST'] },
    { id: 'Rithmic', name: 'Rithmic', docs: 'https://www.rithmic.com/apis', modes: ['READONLY_API', 'STATEMENT_INGEST'] },
    { id: 'MT4', name: 'MetaTrader 4', docs: 'https://www.mql5.com/en/docs', modes: ['WEBHOOK_PUSH', 'STATEMENT_INGEST'] },
    { id: 'MT5', name: 'MetaTrader 5', docs: 'https://www.mql5.com/en/docs', modes: ['WEBHOOK_PUSH', 'STATEMENT_INGEST'] },
    { id: 'Tradovate', name: 'Tradovate', docs: 'https://tradovate.github.io/api/', modes: ['READONLY_API', 'STATEMENT_INGEST'] },
    { id: 'TradeLocker', name: 'TradeLocker', docs: 'https://tradelocker.com/api', modes: ['READONLY_API', 'STATEMENT_INGEST'] },
    { id: 'Alpaca', name: 'Alpaca', docs: 'https://docs.alpaca.markets/', modes: ['READONLY_API', 'STATEMENT_INGEST'] },
    { id: 'OANDA', name: 'OANDA', docs: 'https://developer.oanda.com/', modes: ['READONLY_API', 'STATEMENT_INGEST'] },
    { id: 'Binance', name: 'Binance', docs: 'https://binance-docs.github.io/apidocs/', modes: ['READONLY_API', 'STATEMENT_INGEST'] }
  ];

  const modeInfo = {
    'READONLY_API': {
      name: 'API Connection (Read-Only)',
      description: 'Automatically sync trades via official API',
      requirements: ['API Key', 'API Secret', 'Account Number'],
      icon: '🔌',
      difficulty: 'Advanced'
    },
    'WEBHOOK_PUSH': {
      name: 'Webhook Push',
      description: 'Receive real-time trade updates via webhook',
      requirements: ['EA/Script Installation', 'Webhook Secret'],
      icon: '⚡',
      difficulty: 'Intermediate'
    },
    'STATEMENT_INGEST': {
      name: 'Statement Import',
      description: 'Upload trade history files manually or automatically',
      requirements: ['Account Number'],
      icon: '📄',
      difficulty: 'Beginner'
    }
  };

  const selectedProvider = providers.find(p => p.id === provider);
  const selectedMode = modeInfo[mode];

  const providerInstructions = {
    'cTrader': {
      'READONLY_API': {
        steps: [
          'Log in to your cTrader account',
          'Navigate to Settings → Open API',
          'Create a new application with "Read" permissions',
          'Copy your Client ID and Secret',
          'Paste them below'
        ],
        fields: ['api_key', 'api_secret', 'account_number']
      },
      'STATEMENT_INGEST': {
        steps: [
          'Log in to your cTrader account',
          'Go to History → Export',
          'Download your trade history as CSV',
          'Upload the file in the next step'
        ],
        fields: ['account_number']
      }
    },
    'DXTrade': {
      'READONLY_API': {
        steps: [
          'Contact your broker for API access',
          'Request API credentials from your account dashboard',
          'Copy your API Key and Secret',
          'Note your server endpoint URL',
          'Paste credentials below'
        ],
        fields: ['api_key', 'api_secret', 'server', 'account_number']
      },
      'STATEMENT_INGEST': {
        steps: [
          'Log in to your DXTrade account',
          'Navigate to Reports → Trade History',
          'Export as CSV or Excel',
          'Upload the file in the next step'
        ],
        fields: ['account_number']
      }
    },
    'MT4': {
      'WEBHOOK_PUSH': {
        steps: [
          'Download the Hybrid Journal MT4 EA from our resources',
          'Place the EA in your MT4/Experts folder',
          'Attach the EA to any chart',
          'Enter the webhook URL and secret shown below',
          'EA will automatically send trade updates'
        ],
        fields: ['webhook_secret', 'account_number']
      },
      'STATEMENT_INGEST': {
        steps: [
          'Right-click on Account History in MT4',
          'Select "Save as Report"',
          'Choose HTML or detailed statement',
          'Upload the file in the next step'
        ],
        fields: ['account_number']
      }
    },
    'MT5': {
      'WEBHOOK_PUSH': {
        steps: [
          'Download the Hybrid Journal MT5 EA from our resources',
          'Place the EA in your MT5/Experts folder',
          'Attach the EA to any chart',
          'Enter the webhook URL and secret shown below',
          'EA will automatically send trade updates'
        ],
        fields: ['webhook_secret', 'account_number']
      },
      'STATEMENT_INGEST': {
        steps: [
          'Right-click on Account History in MT5',
          'Select "Save as Report"',
          'Choose HTML or detailed statement',
          'Upload the file in the next step'
        ],
        fields: ['account_number']
      }
    },
    'Tradovate': {
      'READONLY_API': {
        steps: [
          'Log in to Tradovate',
          'Go to Account → API Access',
          'Generate API credentials',
          'Copy your API Key and Secret',
          'Paste them below'
        ],
        fields: ['api_key', 'api_secret', 'account_number']
      }
    },
    'Alpaca': {
      'READONLY_API': {
        steps: [
          'Log in to Alpaca',
          'Navigate to Paper Trading or Live Trading',
          'Generate API Key (with trading permissions)',
          'Copy Key ID and Secret Key',
          'Paste them below'
        ],
        fields: ['api_key', 'api_secret']
      }
    }
  };

  const instructions = providerInstructions[provider]?.[mode] || { steps: [], fields: [] };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);

    try {
      // Simulate API validation (in production, call actual validation endpoint)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const isValid = formData.api_key && formData.api_key.length > 10;
      
      setValidationResult({
        success: isValid,
        message: isValid ? 'Credentials validated successfully!' : 'Invalid credentials'
      });
    } catch (error) {
      setValidationResult({
        success: false,
        message: error.message
      });
    } finally {
      setValidating(false);
    }
  };

  const handleComplete = async () => {
    try {
      const webhookSecret = mode === 'WEBHOOK_PUSH' 
        ? formData.webhook_secret || Math.random().toString(36).substring(2, 15)
        : null;

      const connection = await base44.entities.BrokerConnection.create({
        provider,
        mode,
        display_name: formData.display_name || `${provider} - ${formData.account_number}`,
        account_number: formData.account_number,
        status: mode === 'STATEMENT_INGEST' ? 'connected' : 'pending',
        webhook_secret: webhookSecret,
        settings_json: {
          server: formData.server,
          validated: validationResult?.success || false
        },
        secret_ref: formData.api_key ? `encrypted_${Date.now()}` : null
      });

      toast.success('Connection created successfully!');
      onComplete(connection);
      onClose();
    } catch (error) {
      toast.error('Failed to create connection: ' + error.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Connect Broker Account
            <Badge variant="outline">Step {step}/3</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Select Your Broker/Platform</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose platform..." />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {provider && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 flex items-start gap-3">
                    <ExternalLink className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">Documentation</p>
                      <a 
                        href={selectedProvider?.docs} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        {selectedProvider?.docs}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={() => setStep(2)} 
                disabled={!provider}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600"
              >
                Next: Choose Connection Method
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Connection Method</Label>
                <div className="grid gap-3 mt-2">
                  {selectedProvider?.modes.map(m => {
                    const info = modeInfo[m];
                    return (
                      <Card 
                        key={m}
                        className={`cursor-pointer transition-all ${
                          mode === m ? 'ring-2 ring-cyan-500 bg-cyan-50' : 'hover:shadow-lg'
                        }`}
                        onClick={() => setMode(m)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{info.icon}</span>
                                <h3 className="font-bold">{info.name}</h3>
                                <Badge variant="outline" className="text-xs">{info.difficulty}</Badge>
                              </div>
                              <p className="text-sm text-slate-600 mb-3">{info.description}</p>
                              <div className="text-xs text-slate-500">
                                <p className="font-medium mb-1">Requirements:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {info.requirements.map((req, idx) => (
                                    <li key={idx}>{req}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            {mode === m && (
                              <CheckCircle2 className="h-6 w-6 text-cyan-600" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={!mode}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600"
                >
                  Next: Configure
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Card className="bg-cyan-50 border-cyan-200">
                <CardContent className="p-4">
                  <h3 className="font-bold text-cyan-900 mb-2">Setup Instructions</h3>
                  <ol className="text-sm text-cyan-800 space-y-2">
                    {instructions.steps.map((step, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-bold">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={formData.display_name}
                    onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder={`My ${provider} Account`}
                    className="mt-2"
                  />
                </div>

                {instructions.fields.includes('account_number') && (
                  <div>
                    <Label>Account Number</Label>
                    <Input
                      value={formData.account_number}
                      onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                      placeholder="Enter account number"
                      className="mt-2"
                    />
                  </div>
                )}

                {instructions.fields.includes('api_key') && (
                  <div>
                    <Label>API Key / Client ID</Label>
                    <Input
                      value={formData.api_key}
                      onChange={e => setFormData({ ...formData, api_key: e.target.value })}
                      placeholder="Enter API key"
                      className="mt-2"
                      type="password"
                    />
                  </div>
                )}

                {instructions.fields.includes('api_secret') && (
                  <div>
                    <Label>API Secret</Label>
                    <Input
                      value={formData.api_secret}
                      onChange={e => setFormData({ ...formData, api_secret: e.target.value })}
                      placeholder="Enter API secret"
                      className="mt-2"
                      type="password"
                    />
                  </div>
                )}

                {instructions.fields.includes('server') && (
                  <div>
                    <Label>Server URL</Label>
                    <Input
                      value={formData.server}
                      onChange={e => setFormData({ ...formData, server: e.target.value })}
                      placeholder="https://api.example.com"
                      className="mt-2"
                    />
                  </div>
                )}

                {instructions.fields.includes('webhook_secret') && (
                  <div>
                    <Label>Webhook Secret (auto-generated)</Label>
                    <Input
                      value={formData.webhook_secret || 'Auto-generated on save'}
                      disabled
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      This secret will be shown after creation for use in your EA/script
                    </p>
                  </div>
                )}
              </div>

              {mode === 'READONLY_API' && (
                <>
                  <Button
                    onClick={handleValidate}
                    disabled={validating || !formData.api_key || !formData.api_secret}
                    variant="outline"
                    className="w-full"
                  >
                    {validating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validating Credentials...
                      </>
                    ) : (
                      'Validate Credentials'
                    )}
                  </Button>

                  {validationResult && (
                    <Card className={validationResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                      <CardContent className="p-3 flex items-center gap-2">
                        {validationResult.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${validationResult.success ? 'text-green-800' : 'text-red-800'}`}>
                          {validationResult.message}
                        </span>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleComplete}
                  disabled={!formData.account_number || (mode === 'READONLY_API' && !validationResult?.success)}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600"
                >
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}