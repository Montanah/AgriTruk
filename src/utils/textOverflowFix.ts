/**
 * Text Overflow Prevention Utilities
 *
 * Common props to prevent text overflow across the app
 */

export const textOverflowProps = {
  // For single-line text that should truncate
  singleLine: {
    numberOfLines: 1,
    ellipsizeMode: "tail" as const,
  },

  // For multi-line text with limit
  multiLine: (lines: number = 2) => ({
    numberOfLines: lines,
    ellipsizeMode: "tail" as const,
  }),

  // For text that should adjust font size to fit
  adjustable: {
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.7,
    numberOfLines: 1,
  },

  // For addresses and long location names
  address: {
    numberOfLines: 2,
    ellipsizeMode: "tail" as const,
  },

  // For IDs and codes
  id: {
    numberOfLines: 1,
    ellipsizeMode: "middle" as const,
  },
};

/**
 * Common text styles to prevent overflow
 */
export const textOverflowStyles = {
  flexShrink: 1,
  flexWrap: "wrap" as const,
};
