import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card } from '@/components/ui/card';
import { Wallet } from 'lucide-react';

export default function GlobalAccountSelector({ onAccountsChange }) {
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
    mutationFn: async (selectedAccountIds) => {
      if (settings?.id) {
        return await base44.entities.DashboardSettings.update(settings.id, {
          selected_account_ids: selectedAccountIds
        });
      } else {
        return await base44.entities.DashboardSettings.create({
          selected_account_ids: selectedAccountIds
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboardSettings']);
    }
  });

  const selectedAccountIds = settings?.selected_account_ids || [];

  const handleSelectionChange = (newIds) => {
    updateSettingsMutation.mutate(newIds);
    if (onAccountsChange) {
      onAccountsChange(newIds);
    }
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
  const selectedAccounts = accounts.filter(acc => selectedAccountIds.includes(acc.id));

  return {
    selectedAccountIds,
    selectedAccounts,
    allAccounts: accounts,
    hasSelection: selectedAccountIds.length > 0
  };
}