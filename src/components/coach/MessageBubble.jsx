import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
  };

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          AI
        </div>
      )}
      
      <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
        {message.content && (
          <div className={cn(
            "rounded-2xl px-4 py-3",
            isUser 
              ? "bg-blue-600 text-white" 
              : "bg-white border border-slate-200 shadow-sm"
          )}>
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown 
                className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  code: ({ inline, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    if (!inline && match) {
                      return (
                        <div className="relative group/code my-2">
                          <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto text-xs">
                            <code className={className} {...props}>{children}</code>
                          </pre>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700"
                            onClick={() => copyCode(String(children).replace(/\n$/, ''))}
                          >
                            <Copy className="h-3 w-3 text-slate-400" />
                          </Button>
                        </div>
                      );
                    }
                    return (
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono">
                        {children}
                      </code>
                    );
                  },
                  p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-slate-700">{children}</li>,
                  h3: ({ children }) => <h3 className="text-base font-bold text-slate-900 mt-3 mb-2">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-3 my-2 text-slate-600 italic">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="min-w-full border-collapse border border-slate-300">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-left text-xs">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-slate-300 px-3 py-2 text-xs">{children}</td>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {message.tool_calls?.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.tool_calls.map((toolCall, idx) => {
              const isRunning = toolCall.status === 'running' || toolCall.status === 'in_progress';
              const isComplete = toolCall.status === 'completed' || toolCall.status === 'success';
              
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded px-2 py-1"
                >
                  {isRunning ? (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  ) : isComplete ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-slate-300" />
                  )}
                  <span className="text-slate-700">
                    {toolCall.name?.split('.').pop() || 'Processing'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isUser && (
        <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          U
        </div>
      )}
    </div>
  );
}