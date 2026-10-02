import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { bbIcons, type BBIconName } from '@shared/design/icons';
import { useThemeColors } from '@/ThemeProvider';

export type { BBIconName };

interface IconProps {
  name: BBIconName;
  size?: number;
  /** Stroke (ink) colour. Defaults to the theme's text colour. */
  color?: string;
  /** Duotone fill layer colour. Defaults to the theme's blaze accent. */
  accent?: string;
  /** Turn off the duotone fill (pure-stroke glyph). */
  fillLayer?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Book Buddy duotone icon (same glyphs as the web's <Icon>, from shared/design/icons.ts):
 * an accent fill layer at 0.9 opacity under a 1.8px rounded ink stroke, 24×24 viewBox.
 */
export function Icon({ name, size = 24, color, accent, fillLayer = true, style, accessibilityLabel }: IconProps) {
  const colors = useThemeColors();
  const glyph = bbIcons[name];
  if (!glyph) return null;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    >
      {fillLayer && glyph.fill ? <Path d={glyph.fill} fill={accent ?? colors.saffron} opacity={0.9} /> : null}
      <Path
        d={glyph.stroke}
        stroke={color ?? colors.text}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
