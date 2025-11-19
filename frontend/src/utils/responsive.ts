import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Breakpoints for different device types
const BREAKPOINTS = {
  phone: 600,
  tablet: 900,
  desktop: 1200,
};

// Check if device is a tablet
export const isTablet = (): boolean => {
  const { width, height } = Dimensions.get('window');
  const aspectRatio = height / width;
  const pixelDensity = PixelRatio.get();
  
  // Tablet detection logic:
  // 1. Screen width >= 600dp (tablet breakpoint)
  // 2. Or if width is large and aspect ratio suggests tablet
  // 3. Platform-specific checks
  if (Platform.OS === 'ios') {
    return Platform.isPad || width >= BREAKPOINTS.tablet;
  }
  
  // Android tablet detection
  return width >= BREAKPOINTS.tablet || (width >= 600 && pixelDensity <= 2);
};

// Check if device is landscape
export const isLandscape = (): boolean => {
  const { width, height } = Dimensions.get('window');
  return width > height;
};

// Get responsive dimensions
export const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const tablet = isTablet();
  const landscape = isLandscape();
  
  return {
    width,
    height,
    isTablet: tablet,
    isLandscape: landscape,
    isPhone: !tablet,
    // Responsive multipliers
    scale: tablet ? 1.2 : 1,
    // Max content width for tablets (centered layout)
    maxContentWidth: tablet ? Math.min(width * 0.85, 800) : width,
  };
};

// Responsive font size
export const responsiveFontSize = (size: number): number => {
  const { isTablet } = getResponsiveDimensions();
  const scale = SCREEN_WIDTH / 375; // Base width (iPhone X)
  const fontSize = size * scale;
  
  // Tablet gets slightly larger fonts
  if (isTablet) {
    return fontSize * 1.1;
  }
  
  return fontSize;
};

// Responsive spacing
export const responsiveSpacing = (spacing: number): number => {
  const { isTablet } = getResponsiveDimensions();
  
  // Tablets get more spacing
  if (isTablet) {
    return spacing * 1.3;
  }
  
  return spacing;
};

// Responsive width percentage (with max for tablets)
export const responsiveWidth = (percentage: number, maxWidth?: number): number => {
  const { width, isTablet, maxContentWidth } = getResponsiveDimensions();
  const calculatedWidth = (width * percentage) / 100;
  
  if (isTablet && maxWidth) {
    return Math.min(calculatedWidth, maxWidth);
  }
  
  return calculatedWidth;
};

// Responsive height percentage
export const responsiveHeight = (percentage: number): number => {
  const { height } = Dimensions.get('window');
  return (height * percentage) / 100;
};

// Get number of columns for grid layouts
export const getColumnCount = (defaultColumns: number = 2): number => {
  const { isTablet, width } = getResponsiveDimensions();
  
  if (isTablet) {
    // Tablets: more columns
    if (width >= 1200) return defaultColumns + 2;
    if (width >= 900) return defaultColumns + 1;
    return defaultColumns;
  }
  
  return defaultColumns;
};

// Responsive padding
export const responsivePadding = (basePadding: number): number => {
  const { isTablet, width } = getResponsiveDimensions();
  
  if (isTablet) {
    // Tablets get more padding, but cap it
    const tabletPadding = basePadding * 1.5;
    return Math.min(tabletPadding, width * 0.1);
  }
  
  return basePadding;
};

export default {
  isTablet,
  isLandscape,
  getResponsiveDimensions,
  responsiveFontSize,
  responsiveSpacing,
  responsiveWidth,
  responsiveHeight,
  getColumnCount,
  responsivePadding,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};

