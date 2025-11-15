import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, CheckCircle, Clock, Target } from 'lucide-react';
import { format } from 'date-fns';

export default function GoalCard({ goal, trades, onEdit, onDelete }) {
  const progress = useMemo(() => {
    if (!goal.target_value) return 0;
    
    // Auto-calculate current value based on goal type and trades
    let calculatedValue = goal.current_value || 0;
    
    if (goal.type === 'Profit Target' && trades && trades.length > 0) {
      calculatedValue = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    } else if (goal.type === 'Win Rate' && trades && trades.length > 0) {
      const wins = trades.filter(t => t.pnl > 0).length;
      calculatedValue = (wins / trades.length) * 100;
    }
    
    const percentage = (calculatedValue / goal.target_value) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  }, [goal, trades]);

  const statusColors = {
    'Not Started': 'bg-slate-100 text-slate-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    'Achieved': 'bg-green-100 text-green-700',
    'Abandoned': 'bg-red-100 text-red-700'
  };

  const statusIcons = {
    'Not Started': Clock,
    'In Progress': Target,
    'Achieved': CheckCircle,
    'Abandoned': Clock
  };

  const StatusIcon = statusIcons[goal.status] || Target;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <StatusIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{goal.title}</CardTitle>
            {goal.description && (
              <p className="text-sm text-slate-600 mb-3">{goal.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge className={statusColors[goal.status]}>
                {goal.status}
              </Badge>
              <Badge variant="outline">{goal.type}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(goal)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(goal.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-blue-600">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-sm text-slate-600">
            <span>Current: {goal.current_value || 0}</span>
            <span>Target: {goal.target_value}</span>
          </div>
        </div>

        {/* Dates */}
        {(goal.start_date || goal.target_date) && (
          <div className="flex gap-4 text-sm text-slate-600">
            {goal.start_date && (
              <div>
                <span className="font-medium">Started:</span>{' '}
                {format(new Date(goal.start_date), 'MMM dd, yyyy')}
              </div>
            )}
            {goal.target_date && (
              <div>
                <span className="font-medium">Target:</span>{' '}
                {format(new Date(goal.target_date), 'MMM dd, yyyy')}
              </div>
            )}
          </div>
        )}

        {/* Action Steps */}
        {goal.action_steps && goal.action_steps.length > 0 && (
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Action Steps:</div>
            <ul className="space-y-1">
              {goal.action_steps.slice(0, 3).map((step, idx) => (
                <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{step}</span>
                </li>
              ))}
              {goal.action_steps.length > 3 && (
                <li className="text-sm text-slate-500 italic">
                  +{goal.action_steps.length - 3} more...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Progress Notes */}
        {goal.progress_notes && (
          <div className="pt-3 border-t border-slate-200">
            <div className="text-sm font-medium text-slate-700 mb-1">Notes:</div>
            <p className="text-sm text-slate-600 line-clamp-2">{goal.progress_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}