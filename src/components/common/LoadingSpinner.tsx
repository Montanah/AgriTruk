import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";
import { fonts, spacing } from "../../constants";
import colors from "../../constants/colors";

const { width, height } = Dimensions.get("window");

interface LoadingSpinnerProps {
  visible: boolean;
  message?: string;
  size?: "small" | "medium" | "large";
  type?: "spinner" | "dots" | "pulse";
  overlay?: boolean;
  logo?: boolean;
  onAnimationComplete?: () => void;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  visible,
  message = "Loading...",
  size = "medium",
  type = "spinner",
  overlay = true,
  logo = false,
  onAnimationComplete,
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const dotValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (visible) {
      // Debug: log stack trace when spinner becomes visible to locate the caller
      try {
        // eslint-disable-next-line no-console
        console.log("LoadingSpinner mounted - stack trace:", new Error().stack);
      } catch (e) {
        // ignore
      }
      // Fade in
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Start animations based on type
      if (type === "spinner") {
        Animated.loop(
          Animated.timing(spinValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ).start();
      } else if (type === "pulse") {
        Animated.loop(
          Animated.sequence([
            Animated.timing(scaleValue, {
              toValue: 1.1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      } else if (type === "dots") {
        // Staggered dot animation
        dotValues.forEach((dotValue, index) => {
          Animated.loop(
            Animated.sequence([
              Animated.delay(index * 200),
              Animated.timing(dotValue, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(dotValue, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
            ]),
          ).start();
        });
      }
    } else {
      // Fade out
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onAnimationComplete?.();
      });
    }
  }, [visible, type]);

  if (!visible) return null;

  const getSizeValue = () => {
    switch (size) {
      case "small":
        return 24;
      case "large":
        return 48;
      default:
        return 36;
    }
  };

  const renderSpinner = () => {
    const sizeValue = getSizeValue();

    switch (type) {
      case "spinner":
        return (
          <Animated.View
            style={[
              styles.spinner,
              {
                width: sizeValue,
                height: sizeValue,
                borderRadius: sizeValue / 2,
                transform: [
                  {
                    rotate: spinValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          />
        );

      case "pulse":
        return (
          <Animated.View
            style={[
              styles.pulse,
              {
                width: sizeValue,
                height: sizeValue,
                borderRadius: sizeValue / 2,
                transform: [{ scale: scaleValue }],
              },
            ]}
          />
        );

      case "dots":
        return (
          <View style={styles.dotsContainer}>
            {dotValues.map((dotValue, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: sizeValue / 3,
                    height: sizeValue / 3,
                    borderRadius: sizeValue / 6,
                    opacity: dotValue,
                    transform: [
                      {
                        scale: dotValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  const content = (
    <View style={styles.container}>
      {logo && (
        <Animated.Image
          source={require("../../../assets/images/truk-logo.png")}
          style={[
            styles.logo,
            {
              transform: [
                {
                  scale: scaleValue,
                },
              ],
            },
          ]}
        />
      )}
      {renderSpinner()}
      {message && (
        <Text
          style={[
            styles.message,
            { fontSize: size === "small" ? fonts.size.sm : fonts.size.md },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );

  if (overlay) {
    return (
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacityValue,
          },
        ]}
        pointerEvents="auto"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.1)"]}
          style={StyleSheet.absoluteFill}
        />
        {content}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.inline,
        {
          opacity: opacityValue,
        },
      ]}
    >
      {content}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  inline: {
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
    minWidth: 120,
    minHeight: 120,
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: spacing.md,
    resizeMode: "contain",
  },
  spinner: {
    borderWidth: 3,
    borderColor: colors.background,
    borderTopColor: colors.primary,
    borderRightColor: colors.primary,
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  },
  pulse: {
    backgroundColor: colors.primary,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    backgroundColor: colors.primary,
    marginHorizontal: 4,
  },
  message: {
    color: colors.text.primary,
    fontWeight: "600",
    textAlign: "center",
    marginTop: spacing.md,
    letterSpacing: 0.3,
  },
});

export default LoadingSpinner;
