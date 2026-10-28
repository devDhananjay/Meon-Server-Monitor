import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useMonitor } from '../context/MonitorContext';
import { getColors } from '../theme/colors';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SIZE = 150;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 64;

function buildWavePath(phase, waterY, amplitude, wavelength) {
  'worklet';
  const left = CX - R - 6;
  const right = CX + R + 6;
  const bottom = CY + R + 6;
  let d = `M ${left} ${waterY}`;
  const steps = 20;
  for (let i = 0; i <= steps; i += 1) {
    const x = left + ((right - left) * i) / steps;
    const y = waterY + Math.sin((x / wavelength) * Math.PI * 2 + phase) * amplitude;
    d += ` L ${x} ${y}`;
  }
  d += ` L ${right} ${bottom} L ${left} ${bottom} Z`;
  return d;
}

export default function HealthScoreWave({
  score = 0,
  subtitle = '',
}) {
  const { theme } = useMonitor();
  const c = getColors(theme);
  const phase = useSharedValue(0);
  const phase2 = useSharedValue(0);
  const fillProgress = useSharedValue(0);

  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const displayScore = Math.round(safeScore);

  const tone = useMemo(() => {
    if (safeScore >= 85) return c.green;
    if (safeScore >= 60) return c.cyan;
    if (safeScore >= 35) return c.amber;
    return c.red;
  }, [safeScore, c.green, c.cyan, c.amber, c.red]);

  useEffect(() => {
    phase.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 3400, easing: Easing.linear }),
      -1,
      false,
    );
    phase2.value = withRepeat(
      withTiming(-Math.PI * 2, { duration: 5000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [phase, phase2]);

  useEffect(() => {
    fillProgress.value = withTiming(safeScore / 100, {
      duration: 1100,
      easing: Easing.out(Easing.cubic),
    });
  }, [safeScore, fillProgress]);

  const frontWaveProps = useAnimatedProps(() => {
    const waterY = CY + R - fillProgress.value * (R * 2);
    return {
      d: buildWavePath(phase.value, waterY, 4.5, 48),
    };
  });

  const backWaveProps = useAnimatedProps(() => {
    const waterY = CY + R - fillProgress.value * (R * 2) + 2;
    return {
      d: buildWavePath(phase2.value + 1.1, waterY, 6, 60),
    };
  });

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: c.cyan }]}>Health score</Text>

      {/* Water orb — visual only, no overlapping text */}
      <View style={[styles.orbShell, { shadowColor: tone, borderColor: `${tone}55` }]}>
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <ClipPath id="healthOrbClip">
              <Circle cx={CX} cy={CY} r={R} />
            </ClipPath>
          </Defs>

          <Circle
            cx={CX}
            cy={CY}
            r={R}
            fill={theme === 'light' ? 'rgba(8,145,178,0.05)' : 'rgba(56,213,255,0.05)'}
            stroke={`${tone}40`}
            strokeWidth={2}
          />

          <G clipPath="url(#healthOrbClip)">
            <Rect
              x={CX - R}
              y={CY - R}
              width={R * 2}
              height={R * 2}
              fill={theme === 'light' ? 'rgba(255,255,255,0.22)' : 'rgba(5,14,18,0.25)'}
            />
            <AnimatedPath animatedProps={backWaveProps} fill={`${tone}55`} />
            <AnimatedPath animatedProps={frontWaveProps} fill={`${tone}A8`} />
          </G>

          <Circle
            cx={CX}
            cy={CY}
            r={R}
            fill="transparent"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1.5}
          />
        </Svg>
      </View>

      {/* Percentage clearly below the orb — never clipped/hidden */}
      <Text style={[styles.score, { color: tone }]}>{displayScore}%</Text>

      {subtitle ? (
        <Text style={[styles.subtitle, { color: c.muted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  heading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  orbShell: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  score: {
    marginTop: 12,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 46,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
