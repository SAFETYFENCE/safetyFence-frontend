import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

interface DailyDistanceCardProps {
  distanceKm: number;
  loading?: boolean;
  compact?: boolean;
}

interface DistanceTheme {
  gradientColors: string[];
  icon: string;
  iconName: keyof typeof Ionicons.glyphMap;
  message: string;
  glowColor: string;
  progressColor: string;
}

const getTheme = (km: number): DistanceTheme => {
  if (km < 1) {
    return {
      gradientColors: ['rgba(107, 114, 128, 0.1)', 'rgba(156, 163, 175, 0.05)'],
      icon: '#6b7280',
      iconName: 'footsteps-outline',
      message: '산책을 시작해보세요',
      glowColor: 'rgba(107, 114, 128, 0.2)',
      progressColor: '#9ca3af',
    };
  }
  if (km < 3) {
    return {
      gradientColors: ['rgba(34, 197, 94, 0.15)', 'rgba(74, 222, 128, 0.08)'],
      icon: '#16a34a',
      iconName: 'walk',
      message: '좋은 활동량이에요',
      glowColor: 'rgba(34, 197, 94, 0.25)',
      progressColor: '#22c55e',
    };
  }
  if (km < 5) {
    return {
      gradientColors: ['rgba(59, 130, 246, 0.15)', 'rgba(96, 165, 250, 0.08)'],
      icon: '#2563eb',
      iconName: 'bicycle',
      message: '훌륭한 하루예요!',
      glowColor: 'rgba(59, 130, 246, 0.3)',
      progressColor: '#3b82f6',
    };
  }
  return {
    gradientColors: ['rgba(168, 85, 247, 0.15)', 'rgba(192, 132, 252, 0.08)'],
    icon: '#9333ea',
    iconName: 'rocket',
    message: '대단한 활동량입니다!',
    glowColor: 'rgba(168, 85, 247, 0.3)',
    progressColor: '#a855f7',
  };
};

export default function DailyDistanceCard({ distanceKm, loading = false, compact = false }: DailyDistanceCardProps) {
  const theme = getTheme(distanceKm);

  // 프로그레스 계산 (5km를 100%로 가정)
  const progress = Math.min((distanceKm / 5) * 100, 100);
  const circumference = 2 * Math.PI * 40; // 반지름 40
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (loading) {
    return (
      <View style={[styles.card, {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
      }]}>
        <View className="flex-row items-center justify-center p-5">
          <ActivityIndicator size="small" color={theme.icon} />
          <Text className="text-sm text-gray-600 ml-2">거리 계산 중...</Text>
        </View>
      </View>
    );
  }

  if (compact) {
    return (
      <View style={[styles.compactCard, {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        shadowColor: theme.glowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
      }]}>
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center flex-1">
            {/* 원형 프로그레스 바 with Icon */}
            <View style={styles.progressContainer}>
              <Svg width={56} height={56} style={{ position: 'absolute' }}>
                {/* 배경 원 */}
                <Circle
                  cx={28}
                  cy={28}
                  r={24}
                  stroke="rgba(200, 200, 200, 0.3)"
                  strokeWidth={3}
                  fill="none"
                />
                {/* 프로그레스 원 */}
                <Circle
                  cx={28}
                  cy={28}
                  r={24}
                  stroke={theme.progressColor}
                  strokeWidth={3}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 28 28)`}
                />
              </Svg>
              <Ionicons name={theme.iconName} size={28} color={theme.icon} />
            </View>

            <View className="ml-4">
              <Text className="text-xs text-gray-600 mb-1 font-medium">오늘 이동거리</Text>
              <Text className="text-3xl font-bold tracking-tight" style={{ color: theme.icon }}>
                {distanceKm.toFixed(1)} <Text className="text-xl">km</Text>
              </Text>
            </View>
          </View>
          <Text className="text-xs text-gray-700 font-semibold ml-2 text-right" style={{ maxWidth: 100 }}>
            {theme.message}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      shadowColor: theme.glowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.6)',
    }]}>
      <View className="p-6">
        <View className="flex-row items-center">
          {/* 원형 프로그레스 바 with Icon */}
          <View style={styles.progressContainerLarge}>
            <Svg width={88} height={88} style={{ position: 'absolute' }}>
              {/* 배경 원 */}
              <Circle
                cx={44}
                cy={44}
                r={38}
                stroke="rgba(200, 200, 200, 0.3)"
                strokeWidth={4}
                fill="none"
              />
              {/* 프로그레스 원 */}
              <Circle
                cx={44}
                cy={44}
                r={38}
                stroke={theme.progressColor}
                strokeWidth={4}
                fill="none"
                strokeDasharray={circumference * 1.9}
                strokeDashoffset={(circumference * 1.9) - (progress / 100) * (circumference * 1.9)}
                strokeLinecap="round"
                transform={`rotate(-90 44 44)`}
              />
            </Svg>
            <Ionicons name={theme.iconName} size={42} color={theme.icon} />
          </View>

          <View className="ml-6 flex-1">
            <Text className="text-sm text-gray-600 mb-2 font-medium">오늘 이동거리</Text>
            <Text className="text-5xl font-bold tracking-tight mb-2" style={{ color: theme.icon }}>
              {distanceKm.toFixed(1)} <Text className="text-2xl">km</Text>
            </Text>
            <Text className="text-sm text-gray-700 font-semibold">
              {theme.message}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  compactCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  progressContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressContainerLarge: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
