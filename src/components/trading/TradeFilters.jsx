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

      {/* Tag Filter */}
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-slate-400" />
        <div className="flex gap-2 flex-1">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            placeholder="Filter by tag..."
            className="max-w-xs"
          />
          <Button onClick={addTag} variant="outline" size="sm">
            Add Tag Filter
          </Button>
        </div>
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-cyan-100 text-cyan-700"
              >
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quick Tag Suggestions */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Quick filters:</span>
          {availableTags.slice(0, 8).map((tag) => (
            <button
              key={tag}
              onClick={() => {
                if (!selectedTags.includes(tag)) {
                  onFilterChange({ ...filters, tags: [...selectedTags, tag] });
                }
              }}
              className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}