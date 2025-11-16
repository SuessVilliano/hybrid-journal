import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { SUPPORTED_BROKERS, validateBrokerCredentials } from './brokerAPIHelper';

export default function BrokerConnectionForm({ connection, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(connection || {
    broker_id: 'mt4',
    broker_name: 'MetaTrader 4',
    account_number: '',
    api_key: '',
    api_secret: '',
    server: '',
    auto_sync: true,
    sync_interval: 3600
  });

  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const handleBrokerChange = (broker_id) => {
    const broker = SUPPORTED_BROKERS.find(b => b.id === broker_id);
    setFormData({
      ...formData,
      broker_id,
      broker_name: broker.name
    });
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    
    try {
      const result = await validateBrokerCredentials(formData.broker_id, {
        api_key: formData.api_key,
        api_secret: formData.api_secret,
        account_number: formData.account_number,
        server: formData.server
      });
      
      setValidationResult(result);
    } catch (error) {
      setValidationResult({ valid: false, message: error.message });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      status: validationResult?.valid ? 'connected' : 'pending'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {connection ? 'Edit Broker Connection' : 'Add Broker Connection'}
          </CardTitle>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Broker Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Broker Platform *
              </label>
              <Select value={formData.broker_id} onValueChange={handleBrokerChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_BROKERS.map(broker => (
                    <SelectItem key={broker.id} value={broker.id}>
                      {broker.name} ({broker.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Account Number *
              </label>
              <Input
                value={formData.account_number}
                onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                placeholder="123456789"
                required
              />
            </div>

            {/* API Credentials */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  API Key *
                </label>
                <Input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                  placeholder="Your API key"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  API Secret *
                </label>
                <Input
                  type="password"
                  value={formData.api_secret}
                  onChange={(e) => setFormData({...formData, api_secret: e.target.value})}
                  placeholder="Your API secret"
                  required
                />
              </div>
            </div>

            {/* Server/Endpoint */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Server/Endpoint
              </label>
              <Input
                value={formData.server}
                onChange={(e) => setFormData({...formData, server: e.target.value})}
                placeholder="e.g., demo.server.com:443"
              />
            </div>

            {/* Auto Sync Settings */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.auto_sync}
                  onChange={(e) => setFormData({...formData, auto_sync: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Enable auto-sync</span>
              </label>
              {formData.auto_sync && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Every</span>
                  <Input
                    type="number"
                    value={formData.sync_interval / 60}
                    onChange={(e) => setFormData({...formData, sync_interval: parseInt(e.target.value) * 60})}
                    className="w-20"
                    min="5"
                  />
                  <span className="text-sm text-slate-600">minutes</span>
                </div>
              )}
            </div>

            {/* Validation Status */}
            {validationResult && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                validationResult.valid 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {validationResult.valid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`text-sm ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                  {validationResult.message}
                </span>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                🔒 Your API credentials are encrypted and stored securely. 
                We recommend using read-only API keys with trading permissions disabled for maximum security.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleValidate}
                disabled={validating || !formData.api_key || !formData.account_number}
              >
                {validating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!validationResult?.valid}
              >
                Save Connection
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}