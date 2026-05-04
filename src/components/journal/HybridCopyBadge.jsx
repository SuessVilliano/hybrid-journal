import { ExternalLink, Zap } from 'lucide-react';
import { getProvider, hybridCopyTradeLink, isHybridCopySynced } from '@/lib/providers';

/**
 * Badge rendered on the Trade Detail page when a trade was synced from
 * HybridCopy. Shows the source provider and a deep-link back to the
 * source trade in HybridCopy.
 */
export default function HybridCopyBadge({ trade }) {
  if (!trade || !isHybridCopySynced(trade)) return null;

  const provider = getProvider(trade);
  const link = hybridCopyTradeLink(trade);

  const darkMode =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');

  const Wrapper = link ? 'a' : 'span';
  const wrapperProps = link
    ? { href: link, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-opacity ${
        link ? 'hover:opacity-80 cursor-pointer' : ''
      } ${
        darkMode
          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
          : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
      }`}
    >
      <Zap className="h-3 w-3" />
      <span>Synced from HybridCopy</span>
      {provider && <span className="font-bold">· {provider.label}</span>}
      {link && <ExternalLink className="h-3 w-3" />}
    </Wrapper>
  );
}
