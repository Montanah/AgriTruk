import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollEnabled?: boolean;
  keyboardVerticalOffset?: number;
  behavior?: 'height' | 'position' | 'padding';
  contentContainerStyle?: ViewStyle;
}

const KeyboardAvoidingWrapper: React.FC<KeyboardAvoidingWrapperProps> = ({
  children,
  style,
  scrollEnabled = true,
  keyboardVerticalOffset = 0,
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
  contentContainerStyle,
}) => {
  const insets = useSafeAreaInsets();

  // Calculate appropriate keyboard vertical offset
  const calculatedOffset = keyboardVerticalOffset + (Platform.OS === 'ios' ? insets.bottom : 0);

  if (scrollEnabled) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, style]}
        behavior={behavior}
        keyboardVerticalOffset={calculatedOffset}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={behavior}
      keyboardVerticalOffset={calculatedOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default KeyboardAvoidingWrapper;

