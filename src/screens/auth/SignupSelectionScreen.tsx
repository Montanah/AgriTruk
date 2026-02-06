import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Images } from "../../../assets";
import { colors, fonts, spacing } from "../../constants";

const { width } = Dimensions.get("window");

const roles = [
  {
    key: "shipper",
    label: "Shipper",
    accent: colors.primary,
    icon: (animatedStyle: any) => (
      <Animated.View style={animatedStyle}>
        <FontAwesome5 name="tractor" size={32} color={colors.primary} />
      </Animated.View>
    ),
    description:
      "For shippers who want to move goods, cargo, or luggage from one place to another.",
  },
  {
    key: "business",
    label: "Corporate",
    accent: colors.secondary,
    icon: (animatedStyle: any) => (
      <Animated.View style={animatedStyle}>
        <Ionicons name="business" size={32} color={colors.secondary} />
      </Animated.View>
    ),
    description:
      "For businesses and corporates needing logistics and cargo transport services.",
  },
  {
    key: "broker",
    label: "Broker",
    accent: colors.tertiary,
    icon: (animatedStyle: any) => (
      <Animated.View style={animatedStyle}>
        <FontAwesome5 name="user-tie" size={32} color={colors.tertiary} />
      </Animated.View>
    ),
    description:
      "For intermediaries connecting businesses, shippers, and transporters",
  },
  {
    key: "transporter",
    label: "Transporter",
    accent: "#FF8C00",
    icon: (animatedStyle: any) => (
      <Animated.View style={animatedStyle}>
        <MaterialCommunityIcons name="truck" size={32} color="#FF8C00" />
      </Animated.View>
    ),
    description:
      "For transport companies and fleets to manage vehicles, drivers, and jobs",
  },
  {
    key: "driver",
    label: "Driver",
    accent: colors.tertiary,
    icon: (animatedStyle: any) => (
      <Animated.View style={animatedStyle}>
        <MaterialCommunityIcons
          name="account-tie"
          size={32}
          color={colors.tertiary}
        />
      </Animated.View>
    ),
    description:
      "For skilled drivers seeking career opportunities with transport companies",
  },
];

const SignupSelectionScreen = () => {
  const navigation = useNavigation();

  // Logo left-right motion
  const logoAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(logoAnim, {
          toValue: -1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [logoAnim]);

  const logoTranslate = logoAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-10, 0, 10],
  });

  // Card + icon animations
  const cardAnims = roles.map(() => useRef(new Animated.Value(0)).current);
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Stagger in cards
    Animated.stagger(
      120,
      cardAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
        }),
      ),
    ).start();

    // Looping pulse for icons
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <>
      <StatusBar style="light" translucent />
      <LinearGradient
        colors={[
          "#081c0f",
          colors.primaryDark,
          colors.primary,
          colors.secondary,
          colors.background,
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom", "left", "right"]}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <View style={styles.container}>
            {/* Animated Logo */}
            <View style={styles.logoBgWrap}>
              <View style={styles.logoBg} />
              <Animated.Image
                source={Images.trukLogo}
                style={[
                  styles.logo,
                  { transform: [{ translateX: logoTranslate }] },
                ]}
              />
            </View>
            <Text style={styles.title}>Signing up as?</Text>
            {roles.map((role, i) => (
              <Animated.View
                key={role.key}
                style={{
                  opacity: cardAnims[i],
                  transform: [
                    {
                      translateY: cardAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                    {
                      scale: cardAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("Signup", { role: role.key })
                  }
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.cardWrap,
                      role.key === "transporter" && {
                        borderColor: "#FF8C00",
                        borderWidth: 0.5,
                      },
                      role.key === "driver" && {
                        borderColor: colors.tertiary,
                        borderWidth: 0.5,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={["#ffffffcc", "#f7f9fcbb", "#ffffffaa"]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <Animated.View
                      style={[
                        styles.accentDot,
                        role.key === "transporter"
                          ? {
                              backgroundColor: "#FF8C00",
                              shadowColor: "#FF8C00",
                            }
                          : role.key === "driver"
                            ? {
                                backgroundColor: colors.tertiary,
                                shadowColor: colors.tertiary,
                              }
                            : {
                                backgroundColor: role.accent,
                                shadowColor: role.accent,
                              },
                        {
                          transform: [
                            {
                              scale: cardAnims[i].interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.7, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                    <View style={styles.iconWrap}>
                      {role.icon({ transform: [{ scale: iconPulse }] })}
                    </View>
                    <View style={styles.roleContent}>
                      <Text
                        style={[
                          styles.roleLabel,
                          role.key === "transporter"
                            ? { color: "#FF8C00" }
                            : role.key === "driver"
                              ? { color: colors.tertiary }
                              : { color: role.accent },
                        ]}
                      >
                        {role.label}
                      </Text>
                      <Text style={styles.roleDescription}>
                        {role.description}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? spacing.lg : spacing.md,
    left: spacing.md,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    minHeight: Dimensions.get("window").height - 100,
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  logoBgWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    zIndex: 2,
    width: width * 0.32,
    height: width * 0.32,
  },
  logoBg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width * 0.32,
    height: width * 0.32,
    borderRadius: 24,
    backgroundColor: colors.white,
    zIndex: 1,
    elevation: 6,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  logo: {
    width: width * 0.28,
    height: width * 0.28,
    borderRadius: 18,
    zIndex: 2,
    resizeMode: "contain",
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: "bold",
    color: "#ffffffee",
    textAlign: "center",
    marginBottom: spacing.xl,
    fontFamily: fonts.family.bold,
    letterSpacing: 0.5,
  },
  cardWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 22,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    width: Math.min(width - spacing.xl * 2, 440),
    maxWidth: 440,
    minHeight: 80,
    borderWidth: 1.2,
    borderColor: "#eeeeee",
    position: "relative",
    overflow: Platform.OS === "android" ? "hidden" : "visible",
  },
  accentDot: {
    position: "absolute",
    left: 18,
    top: 18,
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.85,
    zIndex: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#fff",
  },
  iconWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.lg,
    zIndex: 2,
  },
  roleContent: {
    flex: 1,
    zIndex: 2,
  },
  roleLabel: {
    fontSize: fonts.size.lg,
    fontWeight: "700",
    marginBottom: 2,
    fontFamily: fonts.family.bold,
    letterSpacing: 0.2,
  },
  roleDescription: {
    fontSize: fonts.size.md,
    color: "#333",
    lineHeight: 20,
    fontWeight: "500",
    opacity: 0.85,
  },
});

export default SignupSelectionScreen;
