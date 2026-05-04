import { getProvider } from '@/lib/providers';

/**
 * Compact 2-3 letter chip for the trade list, calendar tooltip, and
 * analytics breakdowns. Returns null when the trade has no recognised
 * HybridCopy provider so we don't pollute manual entries.
 */
export default function ProviderChip({ trade, size = 'sm', withLabel = false, className = '' }) {
  const provider = getProvider(trade);
  if (!provider) return null;

  const darkMode =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');

  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5'
      : size === 'lg'
      ? 'text-sm px-2.5 py-1'
      : 'text-xs px-2 py-0.5';

  return (
    <span
      title={provider.label}
      className={`inline-flex items-center gap-1 rounded-md font-bold ${sizeClasses} ${
        darkMode
          ? `${provider.darkBg} ${provider.darkText}`
          : `${provider.bg} ${provider.text}`
      } ${className}`}
    >
      <span aria-hidden="true">{provider.short}</span>
      {withLabel && <span className="font-medium">{provider.label}</span>}
    </span>
  );
}
