import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function App() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <StatusBar style="dark" />
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        TRUK App - SDK 54
      </Text>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={{ marginTop: 20, color: "#666" }}>Loading...</Text>
    </View>
  );
}
