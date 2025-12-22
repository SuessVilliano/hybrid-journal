import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function TradeFilters({ filters, onFilterChange, availableTags = [] }) {
  const [tagInput, setTagInput] = useState('');
  const selectedTags = filters.tags || [];

  const addTag = () => {
    if (tagInput && !selectedTags.includes(tagInput)) {
      onFilterChange({ ...filters, tags: [...selectedTags, tagInput] });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    onFilterChange({ ...filters, tags: selectedTags.filter(t => t !== tag) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-400" />
      
      <Select 
        value={filters.platform || 'all'} 
        onValueChange={(val) => onFilterChange({...filters, platform: val === 'all' ? null : val})}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Platforms</SelectItem>
          <SelectItem value="DXTrade">DXTrade</SelectItem>
          <SelectItem value="cTrader">cTrader</SelectItem>
          <SelectItem value="MatchTrader">MatchTrader</SelectItem>
          <SelectItem value="Rithmic">Rithmic</SelectItem>
          <SelectItem value="MT4">MT4</SelectItem>
          <SelectItem value="MT5">MT5</SelectItem>
          <SelectItem value="Binance">Binance</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.instrument_type || 'all'} 
        onValueChange={(val) => onFilterChange({...filters, instrument_type: val === 'all' ? null : val})}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="Forex">Forex</SelectItem>
          <SelectItem value="Futures">Futures</SelectItem>
          <SelectItem value="Stocks">Stocks</SelectItem>
          <SelectItem value="Crypto">Crypto</SelectItem>
          <SelectItem value="Options">Options</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.side || 'all'} 
        onValueChange={(val) => onFilterChange({...filters, side: val === 'all' ? null : val})}
      >
        <SelectTrigger className="w-28">
          <SelectValue placeholder="Side" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sides</SelectItem>
          <SelectItem value="Long">Long</SelectItem>
          <SelectItem value="Short">Short</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}