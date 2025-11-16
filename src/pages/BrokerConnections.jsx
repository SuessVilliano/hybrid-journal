import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Link as LinkIcon, AlertCircle } from 'lucide-react';
import BrokerConnectionForm from '@/components/brokers/BrokerConnectionForm';
import BrokerConnectionCard from '@/components/brokers/BrokerConnectionCard';
import { syncBrokerTrades } from '@/components/brokers/brokerAPIHelper';

export default function BrokerConnections() {
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);

  const queryClient = useQueryClient();

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['brokerConnections'],
    queryFn: () => base44.entities.BrokerConnection.list('-created_date', 50)
  });

  const createConnectionMutation = useMutation({
    mutationFn: (data) => base44.entities.BrokerConnection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['brokerConnections']);
      setShowForm(false);
      setEditingConnection(null);
    }
  });

  const updateConnectionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BrokerConnection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['brokerConnections']);
      setShowForm(false);
      setEditingConnection(null);
    }
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: (id) => base44.entities.BrokerConnection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['brokerConnections']);
    }
  });

  const handleSubmit = (data) => {
    if (editingConnection) {
      updateConnectionMutation.mutate({ id: editingConnection.id, data });
    } else {
      createConnectionMutation.mutate(data);
    }
  };

  const handleSync = async (connection) => {
    try {
      const result = await syncBrokerTrades(connection);
      
      // Update connection with new balance and sync time
      await updateConnectionMutation.mutateAsync({
        id: connection.id,
        data: {
          ...connection,
          last_sync: new Date().toISOString(),
          account_balance: result.account_balance,
          account_equity: result.account_equity,
          status: 'connected'
        }
      });

      queryClient.invalidateQueries(['trades']);
      
      alert(`✅ Sync complete!\n${result.imported} new trades imported\n${result.skipped} trades already exist`);
    } catch (error) {
      await updateConnectionMutation.mutateAsync({
        id: connection.id,
        data: {
          ...connection,
          status: 'error',
          error_message: error.message
        }
      });
      alert(`❌ Sync failed: ${error.message}`);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure? This will not delete imported trades.')) {
      deleteConnectionMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Broker Connections</h1>
            <p className="text-slate-600 mt-1">Connect your trading accounts for automatic sync</p>
          </div>
          <Button
            onClick={() => {
              setEditingConnection(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Broker
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <LinkIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Broker Integration Features</h3>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>✓ Automatic trade history sync from your broker accounts</li>
                  <li>✓ Real-time account balance and equity tracking</li>
                  <li>✓ Secure encrypted API credential storage</li>
                  <li>✓ Support for MT4/MT5, cTrader, Binance, Coinbase, and more</li>
                  <li>🎯 Simulated trade execution (live execution coming soon)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : connections.length === 0 ? (
          <Card className="p-12 text-center">
            <LinkIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No broker connections yet</h3>
            <p className="text-slate-600 mb-6">
              Connect your broker account to automatically import trades and track balances
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Connect Your First Broker
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map(connection => (
              <BrokerConnectionCard
                key={connection.id}
                connection={connection}
                onEdit={setEditingConnection}
                onDelete={handleDelete}
                onSync={handleSync}
              />
            ))}
          </div>
        )}

        {/* Connection Form */}
        {showForm && (
          <BrokerConnectionForm
            connection={editingConnection}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingConnection(null);
            }}
          />
        )}
      </div>
    </div>
  );
}