import { Box, CircleDot, Cog, Cpu, CupSoda, FileText, Hammer, Layers, Newspaper, Package, Recycle, Wrench, Zap, type LucideIcon } from 'lucide-react-native';

const ICONS: Record<string, LucideIcon> = {
  zap: Zap, cog: Cog, layers: Layers, hammer: Hammer, wrench: Wrench, box: Box, 'file-text': FileText,
  newspaper: Newspaper, 'cup-soda': CupSoda, package: Package, cpu: Cpu, recycle: Recycle,
};
const GROUP_FALLBACK: Record<string, string> = { NON_FERROUS: 'zap', FERROUS: 'hammer', PAPER: 'box', PLASTIC: 'cup-soda', E_WASTE: 'cpu', MIXED: 'recycle' };

export function resolveIcon(iconName?: string, group?: string): LucideIcon {
  const key = String(iconName ?? '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[_\s]+/g, '-');
  return ICONS[key] ?? ICONS[GROUP_FALLBACK[group ?? ''] ?? ''] ?? CircleDot;
}

export default function CategoryIcon({ iconName, group, size = 20, color = '#0F172A' }: { iconName?: string; group?: string; size?: number; color?: string }) {
  const Icon = resolveIcon(iconName, group);
  return <Icon size={size} color={color} />;
}
