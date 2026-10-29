import { useState } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

const APressable = Animated.createAnimatedComponent(Pressable);

/**
 * Drop-in Pressable with tactile feedback: shrinks while pressed, springs back with a little overshoot
 * on release — so every tappable icon, button and card visibly reacts to a tap. Runs on the native thread.
 */
export function Pressy({ style, scaleTo = 0.9, onPressIn, onPressOut, ...rest }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const [v] = useState(() => new Animated.Value(1));
  const to = (x: number, bounce: boolean) => Animated.spring(v, { toValue: x, useNativeDriver: true, speed: 34, bounciness: bounce ? 16 : 0 }).start();
  return (
    <APressable
      {...rest}
      style={[style, { transform: [{ scale: v }] }]}
      onPressIn={(e) => { to(scaleTo, false); onPressIn?.(e); }}
      onPressOut={(e) => { to(1, true); onPressOut?.(e); }}
    />
  );
}
