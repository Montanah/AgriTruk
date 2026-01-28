import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import { getResponsiveDimensions, isTablet, isLandscape } from '../utils/responsive';

export const useResponsive = () => {
  const [dimensions, setDimensions] = useState(getResponsiveDimensions());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(getResponsiveDimensions());
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return {
    ...dimensions,
    isTablet: dimensions.isTablet,
    isLandscape: dimensions.isLandscape,
    isPhone: dimensions.isPhone,
    width: dimensions.width,
    height: dimensions.height,
    maxContentWidth: dimensions.maxContentWidth,
  };
};

export default useResponsive;

