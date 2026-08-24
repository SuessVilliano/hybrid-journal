import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// AlertRule CRUD, sorted by priority_order ascending (first match wins).
export function useAlertRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const list = await base44.entities.AlertRule.list('-priority_order', 200);
      // list with '-' sort is descending; we want ascending priority_order
      const sorted = [...list].sort((a, b) => (a.priority_order ?? 0) - (b.priority_order ?? 0));
      setRules(sorted);
    } catch (e) {
      console.error('useAlertRules refresh failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addRule = useCallback(async (rule) => {
    const created = await base44.entities.AlertRule.create({
      priority_order: (rules.length ? Math.max(...rules.map(r => r.priority_order ?? 0)) : 0) + 1,
      enabled: true,
      volume: 100,
      repeat: 1,
      ...rule
    });
    setRules(prev => [...prev, created].sort((a, b) => (a.priority_order ?? 0) - (b.priority_order ?? 0)));
    return created;
  }, [rules]);

  const updateRule = useCallback(async (id, patch) => {
    const updated = await base44.entities.AlertRule.update(id, patch);
    setRules(prev => prev.map(r => (r.id === id ? { ...r, ...updated } : r))
      .sort((a, b) => (a.priority_order ?? 0) - (b.priority_order ?? 0)));
    return updated;
  }, []);

  const deleteRule = useCallback(async (id) => {
    await base44.entities.AlertRule.delete(id);
    setRules(prev => prev.filter(r => r.id !== id));
  }, []);

  const moveRule = useCallback(async (rule, dir) => {
    const idx = rules.findIndex(r => r.id === rule.id);
    const swapWith = dir === 'up' ? rules[idx - 1] : rules[idx + 1];
    if (!swapWith) return;
    await Promise.all([
      base44.entities.AlertRule.update(rule.id, { priority_order: swapWith.priority_order }),
      base44.entities.AlertRule.update(swapWith.id, { priority_order: rule.priority_order })
    ]);
    setRules(prev => {
      const next = [...prev];
      const a = next.findIndex(r => r.id === rule.id);
      const b = next.findIndex(r => r.id === swapWith.id);
      [next[a].priority_order, next[b].priority_order] = [next[b].priority_order, next[a].priority_order];
      return [...next].sort((a, b) => (a.priority_order ?? 0) - (b.priority_order ?? 0));
    });
  }, [rules]);

  return { rules, loading, refresh, addRule, updateRule, deleteRule, moveRule };
}