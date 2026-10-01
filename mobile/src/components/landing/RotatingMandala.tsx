import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

// Safe dynamic import of react-native-svg for native platforms (iOS/Android)
let SvgComp: any = View;
let CircleComp: any = View;
let GComp: any = View;
let PathComp: any = View;

if (Platform.OS !== 'web') {
  try {
    const RNSvg = require('react-native-svg');
    SvgComp = RNSvg.default || RNSvg.Svg;
    CircleComp = RNSvg.Circle;
    GComp = RNSvg.G;
    PathComp = RNSvg.Path;
  } catch (e) {
    // Fallback if native module not linked
  }
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function RotatingMandala({
  size = 280,
  opacity = 0.4,
  colorSaffron = 'rgba(255, 153, 51, 0.65)',
  colorTeal = 'rgba(0, 106, 110, 0.55)',
  colorGold = 'rgba(255, 215, 0, 0.75)',
  style,
}: {
  size?: number;
  opacity?: number;
  colorSaffron?: string;
  colorTeal?: string;
  colorGold?: string;
  style?: any;
}) {
  const spinValue1 = useRef(new Animated.Value(0)).current;
  const spinValue2 = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    // Clockwise spin (outer 12-petal ring)
    const spin1 = Animated.loop(
      Animated.timing(spinValue1, {
        toValue: 1,
        duration: 35000,
        easing: Easing.linear,
        useNativeDriver: !isWeb,
      }),
    );

    // Counter-clockwise spin (middle 8-petal ring)
    const spin2 = Animated.loop(
      Animated.timing(spinValue2, {
        toValue: 1,
        duration: 25000,
        easing: Easing.linear,
        useNativeDriver: !isWeb,
      }),
    );

    // Breathing pulse scale animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.06,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: !isWeb,
        }),
        Animated.timing(pulseValue, {
          toValue: 1.0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: !isWeb,
        }),
      ]),
    );

    spin1.start();
    spin2.start();
    pulse.start();

    return () => {
      spin1.stop();
      spin2.stop();
      pulse.stop();
    };
  }, [spinValue1, spinValue2, pulseValue, isWeb]);

  const petals12 = Array.from({ length: 12 }, (_, i) => i * 30);
  const petals8 = Array.from({ length: 8 }, (_, i) => i * 45);

  return (
    <AnimatedView
      style={[
        styles.container,
        {
          width: size,
          height: size,
          opacity,
          transform: [{ scale: pulseValue }],
        },
        style,
      ]}
      pointerEvents="none"
    >
      {isWeb ? (
        <svg viewBox="0 0 400 400" width={size} height={size} style={{ overflow: 'visible' }}>
          <style>{`
            @keyframes mandalaSpinClockwise {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes mandalaSpinCounter {
              from { transform: rotate(0deg); }
              to { transform: rotate(-360deg); }
            }
            .mandala-outer-spin {
              animation: mandalaSpinClockwise 35s linear infinite;
              transform-origin: 200px 200px;
            }
            .mandala-inner-spin {
              animation: mandalaSpinCounter 25s linear infinite;
              transform-origin: 200px 200px;
            }
          `}</style>
          {/* Outermost ring - 12 petals (Clockwise Rotation) */}
          <g className="mandala-outer-spin">
            <circle cx="200" cy="200" r="180" fill="none" stroke={colorSaffron} strokeWidth="1.2" />
            <circle cx="200" cy="200" r="160" fill="none" stroke={colorSaffron} strokeWidth="0.8" />
            {petals12.map((deg) => (
              <path
                key={`outer-${deg}`}
                d="M200,45 Q220,70 200,100 Q180,70 200,45Z"
                fill="rgba(255,107,53,0.18)"
                stroke={colorSaffron}
                strokeWidth="0.8"
                transform={`rotate(${deg} 200 200)`}
              />
            ))}
          </g>

          {/* Middle ring - 8 petals (Counter-Clockwise Rotation) */}
          <g className="mandala-inner-spin">
            <circle cx="200" cy="200" r="100" fill="none" stroke={colorTeal} strokeWidth="1.2" />
            {petals8.map((deg) => (
              <path
                key={`mid-${deg}`}
                d="M200,110 Q215,135 200,155 Q185,135 200,110Z"
                fill="rgba(0,106,110,0.22)"
                stroke={colorTeal}
                strokeWidth="1"
                transform={`rotate(${deg} 200 200)`}
              />
            ))}
          </g>

          {/* Inner lotus core */}
          <g>
            <circle cx="200" cy="200" r="40" fill="rgba(255,215,0,0.15)" stroke={colorGold} strokeWidth="1.5" />
            <circle cx="200" cy="200" r="20" fill="rgba(255,215,0,0.3)" stroke={colorSaffron} strokeWidth="1.5" />
            <circle cx="200" cy="200" r="8" fill={colorGold} />
          </g>
        </svg>
      ) : (
        <SvgComp viewBox="0 0 400 400" width={size} height={size}>
          {/* Outermost ring - 12 petals (Clockwise Rotation) */}
          <GComp origin="200, 200">
            <CircleComp cx="200" cy="200" r="180" fill="none" stroke={colorSaffron} strokeWidth="1.2" />
            <CircleComp cx="200" cy="200" r="160" fill="none" stroke={colorSaffron} strokeWidth="0.8" />
            {petals12.map((deg: number) => (
              <PathComp
                key={`outer-${deg}`}
                d="M200,45 Q220,70 200,100 Q180,70 200,45Z"
                fill="rgba(255,107,53,0.18)"
                stroke={colorSaffron}
                strokeWidth="0.8"
                transform={`rotate(${deg} 200 200)`}
              />
            ))}
          </GComp>

          {/* Middle ring - 8 petals (Counter-Clockwise Rotation) */}
          <GComp origin="200, 200">
            <CircleComp cx="200" cy="200" r="100" fill="none" stroke={colorTeal} strokeWidth="1.2" />
            {petals8.map((deg: number) => (
              <PathComp
                key={`mid-${deg}`}
                d="M200,110 Q215,135 200,155 Q185,135 200,110Z"
                fill="rgba(0,106,110,0.22)"
                stroke={colorTeal}
                strokeWidth="1"
                transform={`rotate(${deg} 200 200)`}
              />
            ))}
          </GComp>

          {/* Inner lotus core */}
          <GComp>
            <CircleComp cx="200" cy="200" r="40" fill="rgba(255,215,0,0.15)" stroke={colorGold} strokeWidth="1.5" />
            <CircleComp cx="200" cy="200" r="20" fill="rgba(255,215,0,0.3)" stroke={colorSaffron} strokeWidth="1.5" />
            <CircleComp cx="200" cy="200" r="8" fill={colorGold} />
          </GComp>
        </SvgComp>
      )}
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
