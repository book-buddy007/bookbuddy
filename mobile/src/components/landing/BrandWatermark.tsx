import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * Soft background watermark for hero and auth screens: the two-circle brand mark
 * (cobalt + blaze) as blurred-looking radial glows. Static on purpose: the design
 * system has no idle motion. Replaces the old rotating mandala (retired on web too).
 */
export function BrandWatermark({ size = 280, opacity = 0.4, style }: { size?: number; opacity?: number; style?: any }) {
  const r = size * 0.36;
  return (
    <View pointerEvents="none" style={[{ width: size * 1.4, height: size, opacity }, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${size * 1.4} ${size}`}>
        <Defs>
          <RadialGradient id="bwCobalt" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#4C6FFF" stopOpacity="0.9" />
            <Stop offset="70%" stopColor="#1E3A8A" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="bwBlaze" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FF8A3D" stopOpacity="0.95" />
            <Stop offset="65%" stopColor="#FF4D00" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#FF4D00" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size * 0.5} cy={size * 0.5} r={r * 1.35} fill="url(#bwCobalt)" />
        <Circle cx={size * 0.9} cy={size * 0.5} r={r * 1.35} fill="url(#bwBlaze)" />
      </Svg>
    </View>
  );
}
