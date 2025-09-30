import React, { useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FormKeyboardWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardVerticalOffset?: number;
  enableDismissOnTap?: boolean;
  refreshControl?: React.ReactElement<RefreshControl>;
}

const FormKeyboardWrapper: React.FC<FormKeyboardWrapperProps> = ({
  children,
  style,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
  enableDismissOnTap = true,
  refreshControl,
}) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Calculate appropriate keyboard vertical offset
  const calculatedOffset = keyboardVerticalOffset + (Platform.OS === 'ios' ? insets.bottom : 0);

  const dismissKeyboard = () => {
    if (enableDismissOnTap) {
      Keyboard.dismiss();
    }
  };

  const handleContentSizeChange = () => {
    // Auto-scroll to bottom when content size changes (useful for dynamic forms)
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const Wrapper = enableDismissOnTap ? TouchableWithoutFeedback : React.Fragment;
  const wrapperProps = enableDismissOnTap ? { onPress: dismissKeyboard } : {};

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={calculatedOffset}
    >
      <Wrapper {...wrapperProps}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          onContentSizeChange={handleContentSizeChange}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      </Wrapper>
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
    paddingBottom: 20, // Extra padding at bottom for better UX
  },
});

export default FormKeyboardWrapper;

