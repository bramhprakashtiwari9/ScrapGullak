import Svg, { Ellipse, Path, Rect, Text as SvgText } from 'react-native-svg';

export default function GullakMark({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width="64" height="64" rx="16" fill="#10B981" opacity={0.18} />
      <Ellipse cx="32" cy="15" rx="7" ry="4" fill="#F59E0B" />
      <Path d="M22 18c-9 4-12 15-9 25 3 9 11 13 19 13s16-4 19-13c3-10 0-21-9-25z" fill="#10B981" />
      <Rect x="26" y="22" width="12" height="3" rx="1.5" fill="#0F172A" />
      <SvgText x="32" y="47" textAnchor="middle" fontWeight="700" fontSize="16" fill="#FFFFFF">₹</SvgText>
    </Svg>
  );
}
