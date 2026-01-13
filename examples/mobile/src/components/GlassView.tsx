// GlassView - cross-platform glass effect component
import React from 'react';
import { View, Platform, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  className?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function GlassView({
  intensity = 60,
  tint = 'light',
  className,
  style,
  children,
}: GlassViewProps) {
  if (Platform.OS === 'web') {
    // Web fallback with CSS backdrop-filter
    return (
      <View
        className={className}
        style={[
          {
            backgroundColor: tint === 'light'
              ? 'rgba(255, 255, 255, 0.7)'
              : 'rgba(0, 0, 0, 0.5)',
            // @ts-ignore - web-specific CSS
            backdropFilter: `blur(${intensity / 5}px)`,
            WebkitBackdropFilter: `blur(${intensity / 5}px)`,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      className={className}
      style={style}
    >
      {children}
    </BlurView>
  );
}
