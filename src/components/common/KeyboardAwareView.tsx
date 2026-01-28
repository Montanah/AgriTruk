import React, { useRef, useEffect } from 'react';
import {
  View,
  ViewProps,
  Keyboard,
  Platform,
  KeyboardEvent,
  Animated,
} from 'react-native';
import { useKeyboard } from '../../hooks/useKeyboard';

interface KeyboardAwareViewProps extends ViewProps {
  children: React.ReactNode;
  extraOffset?: number;
  enableOnAndroid?: boolean;
}

const KeyboardAwareView: React.FC<KeyboardAwareViewProps> = ({
  children,
  extraOffset = 20,
  enableOnAndroid = true,
  style,
  ...props
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const { isKeyboardVisible, keyboardHeight } = useKeyboard();

  useEffect(() => {
    if (!enableOnAndroid) return;

    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event: KeyboardEvent) => {
        Animated.timing(translateY, {
          toValue: -(keyboardHeight / 2) - extraOffset,
          duration: Platform.OS === 'ios' ? event.duration || 250 : 250,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (event: KeyboardEvent) => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? event.duration || 250 : 250,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [keyboardHeight, extraOffset, enableOnAndroid, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ translateY }],
        },
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

export default KeyboardAwareView;
