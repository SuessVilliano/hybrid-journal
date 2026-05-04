import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { HYBRIDCOPY_PROVIDERS, getProvider } from '@/lib/providers';

// Resolve the row of DashboardSettings owned by the current user.
// `list()[0]` is unsafe across users — we explicitly pick the row whose
// created_by matches the logged-in email so two users in the same browser
// or admin views never collide.
async function loadCurrentDashboardSettings() {
  const me = await base44.auth.me().catch(() => null);
  const all = await base44.entities.DashboardSettings.list().catch(() => []);
  if (!me?.email) return all[0] || null;
  return all.find((s) => s.created_by === me.email) || null;
}

export default function GlobalAccountSelector({ onAccountsChange, onProvidersChange }) {
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list('-created_date', 100)
  });

  const { data: settings } = useQuery({
    queryKey: ['dashboardSettings'],
    queryFn: loadCurrentDashboardSettings
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
      queryClient.invalidateQueries({ queryKey: ['dashboardSettings'] });
    }
  });

  const selectedAccountIds = settings?.selected_account_ids || [];
  const selectedProviders = settings?.selected_providers || [];

  // Notify parents on every render-after-load so pages that subscribe via
  // onAccountsChange pick up the persisted selection on first mount, not
  // only after the user clicks something.
  const accountIdsKey = JSON.stringify(selectedAccountIds);
  const providersKey = JSON.stringify(selectedProviders);
  useEffect(() => {
    if (onAccountsChange) onAccountsChange(selectedAccountIds);
  }, [accountIdsKey, onAccountsChange]);
  useEffect(() => {
    if (onProvidersChange) onProvidersChange(selectedProviders);
  }, [providersKey, onProvidersChange]);

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

// Hook to get selected accounts in any component.
//
// Returns a `filterTrades(trades)` helper that every page should use when
// rendering account-scoped data. Centralising the filter prevents drift
// between pages — all of them already need to handle:
//   • exact account_id match
//   • HybridCopy synced trades that only carry an external_account_id —
//     resolve to a local Account by matching account.external_id /
//     account_external_id
//   • selected provider chips applied as an AND filter
export function useSelectedAccounts() {
  const { data: settings } = useQuery({
    queryKey: ['dashboardSettings'],
    queryFn: loadCurrentDashboardSettings
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list('-created_date', 100)
  });

  const selectedAccountIds = settings?.selected_account_ids || [];
  const selectedProviders = settings?.selected_providers || [];
  const selectedAccounts = accounts.filter(acc => selectedAccountIds.includes(acc.id));

  // Build a fast lookup of the external ids attached to each selected
  // account so HybridCopy trades that only carry account_external_id still
  // get matched.
  const selectedExternalIds = new Set();
  for (const acc of selectedAccounts) {
    if (acc.external_id) selectedExternalIds.add(String(acc.external_id));
    if (acc.account_external_id) selectedExternalIds.add(String(acc.account_external_id));
    if (acc.account_number) selectedExternalIds.add(String(acc.account_number));
  }

  const matchesAccount = (trade) => {
    if (selectedAccountIds.length === 0) return true;
    if (trade.account_id && selectedAccountIds.includes(trade.account_id)) return true;
    const ext = trade.account_external_id || trade.external_account_id;
    if (ext && selectedExternalIds.has(String(ext))) return true;
    return false;
  };

  const matchesProvider = (trade) => {
    if (selectedProviders.length === 0) return true;
    const provider = getProvider(trade);
    if (!provider) return false;
    return selectedProviders.includes(provider.key);
  };

  const filterTrades = (trades) => {
    if (!Array.isArray(trades)) return [];
    if (selectedAccountIds.length === 0 && selectedProviders.length === 0) {
      return trades;
    }
    return trades.filter((t) => matchesAccount(t) && matchesProvider(t));
  };

  return {
    selectedAccountIds,
    selectedProviders,
    selectedAccounts,
    allAccounts: accounts,
    hasSelection: selectedAccountIds.length > 0 || selectedProviders.length > 0,
    matchesAccount,
    matchesProvider,
    filterTrades
  };
}