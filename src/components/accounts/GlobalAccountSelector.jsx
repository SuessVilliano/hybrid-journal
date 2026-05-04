import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { HYBRIDCOPY_PROVIDERS } from '@/lib/providers';

export default function GlobalAccountSelector({ onAccountsChange, onProvidersChange }) {
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list('-created_date', 100)
  });

  const { data: settings } = useQuery({
    queryKey: ['dashboardSettings'],
    queryFn: async () => {
      const allSettings = await base44.entities.DashboardSettings.list();
      return allSettings[0] || null;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (patch) => {
      if (settings?.id) {
        return await base44.entities.DashboardSettings.update(settings.id, patch);
      } else {
        return await base44.entities.DashboardSettings.create(patch);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboardSettings']);
    }
  });

  const selectedAccountIds = settings?.selected_account_ids || [];
  const selectedProviders = settings?.selected_providers || [];

  const handleSelectionChange = (newIds) => {
    updateSettingsMutation.mutate({ selected_account_ids: newIds });
    if (onAccountsChange) {
      onAccountsChange(newIds);
    }
  };

  const toggleProvider = (key) => {
    const next = selectedProviders.includes(key)
      ? selectedProviders.filter((k) => k !== key)
      : [...selectedProviders, key];
    updateSettingsMutation.mutate({ selected_providers: next });
    if (onProvidersChange) onProvidersChange(next);
  };

  const accountOptions = accounts.map(acc => ({
    label: `${acc.name} - $${acc.initial_balance?.toFixed(0) || 0}`,
    value: acc.id
  }));

  const selectedAccounts = accounts.filter(acc => selectedAccountIds.includes(acc.id));

  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <Card className={`p-4 ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
      <div className="flex items-center gap-3">
        <Wallet className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
        <div className="flex-1">
          <div className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Viewing Data For:
          </div>
          <MultiSelect
            options={accountOptions}
            selected={selectedAccountIds}
            onChange={handleSelectionChange}
            placeholder="Select trading accounts..."
            className="w-full"
          />
        </div>
        {selectedAccounts.length > 0 && (
          <div className="text-right">
            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {selectedAccounts.length} account{selectedAccounts.length > 1 ? 's' : ''}
            </div>
            <div className={`text-sm font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
              ${selectedAccounts.reduce((sum, acc) => sum + (acc.initial_balance || 0), 0).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          HybridCopy provider:
        </span>
        {HYBRIDCOPY_PROVIDERS.map((p) => {
          const active = selectedProviders.includes(p.key);
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => toggleProvider(p.key)}
              className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${
                active
                  ? darkMode
                    ? `${p.darkBg} ${p.darkText} border-transparent`
                    : `${p.bg} ${p.text} border-transparent`
                  : darkMode
                    ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
              title={p.label}
            >
              {p.short} · {p.label}
            </button>
          );
        })}
        {selectedProviders.length > 0 && (
          <button
            type="button"
            onClick={() => updateSettingsMutation.mutate({ selected_providers: [] })}
            className={`text-xs underline ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
          >
            clear
          </button>
        )}
      </div>
    </Card>
  );
}

// Hook to get selected accounts in any component
export function useSelectedAccounts() {
  const { data: settings } = useQuery({
    queryKey: ['dashboardSettings'],
    queryFn: async () => {
      const allSettings = await base44.entities.DashboardSettings.list();
      return allSettings[0] || null;
    }
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list('-created_date', 100)
  });

  const selectedAccountIds = settings?.selected_account_ids || [];
  const selectedProviders = settings?.selected_providers || [];
  const selectedAccounts = accounts.filter(acc => selectedAccountIds.includes(acc.id));

  return {
    selectedAccountIds,
    selectedProviders,
    selectedAccounts,
    allAccounts: accounts,
    hasSelection: selectedAccountIds.length > 0
  };
}