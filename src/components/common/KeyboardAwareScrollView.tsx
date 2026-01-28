import React, { useRef, useEffect } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  Keyboard,
  Platform,
  KeyboardEvent,
} from 'react-native';
import { useKeyboard } from '../../hooks/useKeyboard';

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  extraScrollHeight?: number;
  enableOnAndroid?: boolean;
  keyboardShouldPersistTaps?: 'never' | 'always' | 'handled';
}

const KeyboardAwareScrollView: React.FC<KeyboardAwareScrollViewProps> = ({
  children,
  extraScrollHeight = 20,
  enableOnAndroid = true,
  keyboardShouldPersistTaps = 'handled',
  ...props
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const { isKeyboardVisible, keyboardHeight } = useKeyboard();

  useEffect(() => {
    if (!isKeyboardVisible || !enableOnAndroid) return;

    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event: KeyboardEvent) => {
        // Small delay to ensure the keyboard is fully shown
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, [isKeyboardVisible, enableOnAndroid]);

  return (
    <ScrollView
      ref={scrollViewRef}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: isKeyboardVisible ? keyboardHeight + extraScrollHeight : 0,
      }}
      {...props}
    >
      {children}
    </ScrollView>
  );
};

export default KeyboardAwareScrollView;
