import { Box, CircleDot, Cog, Cpu, CupSoda, FileText, Hammer, Layers, Newspaper, Package, Recycle, Wrench, Zap } from 'lucide-react';

const ICONS = { zap: Zap, cog: Cog, layers: Layers, hammer: Hammer, wrench: Wrench, box: Box, 'file-text': FileText, newspaper: Newspaper, 'cup-soda': CupSoda, package: Package, cpu: Cpu, recycle: Recycle };
const GROUP_FALLBACK = { NON_FERROUS: 'zap', FERROUS: 'hammer', PAPER: 'box', PLASTIC: 'cup-soda', E_WASTE: 'cpu', MIXED: 'recycle' };

/** Accepts backend iconName in any case style: "FileText", "file_text", "file-text". */
export function resolveIcon(iconName, group) {
  const key = String(iconName || '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[_\s]+/g, '-');
  return ICONS[key] || ICONS[GROUP_FALLBACK[group]] || CircleDot;
}

export default function CategoryIcon({ iconName, group, className = 'h-5 w-5', ...rest }) {
  const Icon = resolveIcon(iconName, group);
  return <Icon className={className} aria-hidden="true" {...rest} />;
}
