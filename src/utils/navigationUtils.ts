import { NavigationProp } from '@react-navigation/native';

/**
 * Handles back button navigation with fallback
 * @param navigation - Navigation object
 * @param fallbackScreen - Screen to navigate to if no previous screen exists
 * @param fallbackParams - Parameters to pass to fallback screen
 */
export const handleBackNavigation = (
  navigation: NavigationProp<any>,
  fallbackScreen: string = 'SignIn',
  fallbackParams?: any
) => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate(fallbackScreen, fallbackParams);
  }
};

/**
 * Handles back navigation for verification screens
 * Falls back to signup screen with correction mode
 */
export const handleVerificationBackNavigation = (
  navigation: NavigationProp<any>,
  userData?: {
    email?: string;
    phone?: string;
    role?: string;
    password?: string;
  }
) => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate('Signup', {
      ...userData,
      isCorrection: true
    });
  }
};

/**
 * Handles back navigation for auth screens
 * Falls back to signin screen
 */
export const handleAuthBackNavigation = (navigation: NavigationProp<any>) => {
  handleBackNavigation(navigation, 'SignIn');
};

/**
 * Handles back navigation for main app screens
 * Falls back to appropriate tab based on role
 */
export const handleMainAppBackNavigation = (
  navigation: NavigationProp<any>,
  role?: string
) => {
  let fallbackScreen = 'MainTabs';
  
  if (role === 'transporter') {
    fallbackScreen = 'TransporterTabs';
  } else if (role === 'broker') {
    fallbackScreen = 'BrokerTabs';
  } else if (role === 'business') {
    fallbackScreen = 'BusinessStack';
  }
  
  handleBackNavigation(navigation, fallbackScreen);
};


