# 🚛 TRUK App Icon Themes Guide

## 🎨 Available Icon Themes

Your TRUK app now has **4 professional icon themes** to choose from, each optimized for different use cases and device preferences.

### 1. 🚛 **TRUK Brand Theme (Default)**

- **Background**: Your main dark green (#0F2B04)
- **Truck**: Dark green with 3D effect
- **TRUK Text**: Cream/off-white (#f5f5dc)
- **Best for**: Authentic TRUK branding, professional appearance
- **Files**: `icon.png`, `ios-icon-*.png`, `android-icon-*.png`

### 2. ☀️ **Light Theme**

- **Background**: White (#ffffff)
- **Truck**: Dark green with 3D effect
- **TRUK Text**: Dark gray (#1f2937)
- **Best for**: Light mode devices, clean appearance
- **Files**: `icon-light.png`, `ios-icon-*-light.png`, `android-icon-*-light.png`

### 3. 🌿 **Surface Theme**

- **Background**: Light green surface (#EAF4EA)
- **Truck**: Dark green with 3D effect
- **TRUK Text**: Cream/off-white (#f5f5dc)
- **Best for**: Brand consistency, nature/transport focus
- **Files**: `icon-surface.png`, `ios-icon-*-surface.png`, `android-icon-*-surface.png`

### 4. 🟢 **Secondary Theme**

- **Background**: Bright green (#27AE60)
- **Truck**: Dark green with 3D effect
- **TRUK Text**: Cream/off-white (#f5f5dc)
- **Best for**: Accent branding, vibrant appearance
- **Files**: `icon-secondary.png`, `ios-icon-*-secondary.png`, `android-icon-*-secondary.png`

### 5. 🟤 **Accent Theme**

- **Background**: Darker green (#0A1D02)
- **Truck**: Dark green with 3D effect
- **TRUK Text**: Cream/off-white (#f5f5dc)
- **Best for**: Premium branding, sophisticated appearance
- **Files**: `icon-accent.png`, `ios-icon-*-accent.png`, `android-icon-*-accent.png`

## 🔧 How to Use Different Themes

### Option 1: Change Main App Icon

Update your `app.json` to use a different theme:

```json
{
  "expo": {
    "icon": "./assets/images/icon-light.png", // Light theme
    "ios": {
      "icon": "./assets/images/ios-icon-180-light.png"
    },
    "android": {
      "icon": "./assets/images/android-icon-512-light.png"
    }
  }
}
```

### Option 2: Dynamic Theme Selection

You can create a theme selector in your app that changes icons based on user preference:

```typescript
// Example theme configuration
const iconThemes = {
  dark: {
    icon: require('./assets/images/icon.png'),
    iosIcon: require('./assets/images/ios-icon-180.png'),
    androidIcon: require('./assets/images/android-icon-512.png'),
  },
  light: {
    icon: require('./assets/images/icon-light.png'),
    iosIcon: require('./assets/images/ios-icon-180-light.png'),
    androidIcon: require('./assets/images/android-icon-512-light.png'),
  },
  primary: {
    icon: require('./assets/images/icon-primary.png'),
    iosIcon: require('./assets/images/ios-icon-180-primary.png'),
    androidIcon: require('./assets/images/android-icon-512-primary.png'),
  },
  gradient: {
    icon: require('./assets/images/icon-gradient.png'),
    iosIcon: require('./assets/images/ios-icon-180-gradient.png'),
    androidIcon: require('./assets/images/android-icon-512-gradient.png'),
  },
};
```

## 📱 Icon Sizes Available

Each theme includes **30+ icon sizes** for all platforms:

- **Main Icons**: 1024×1024 (app stores)
- **iOS Icons**: 20×20 to 1024×1024 (all devices)
- **Android Icons**: 36×36 to 512×512 (all densities)
- **Adaptive Icons**: 108×108 (modern Android)
- **Splash Icons**: 200×200 (app launch)
- **Favicons**: 32×32 (web browsers)

## 🎯 Theme Recommendations

### **For Professional Apps**

- **Dark Theme**: Corporate, business, premium feel
- **Light Theme**: Clean, modern, accessible

### **For Transport/Logistics Apps**

- **Primary Theme**: Emphasizes your industry focus
- **Dark Theme**: Professional, trustworthy appearance

### **For Modern Apps**

- **Gradient Theme**: Enhanced visual appeal
- **Light Theme**: Clean, contemporary look

### **For User Preference**

- **Dark Theme**: Better for OLED screens, battery saving
- **Light Theme**: Better for outdoor visibility, accessibility

## 🚀 Implementation Steps

1. **Choose Your Theme**: Decide which theme best fits your app's personality
2. **Update app.json**: Change the icon paths to your preferred theme
3. **Test the Icons**: Build and test on different devices
4. **Deploy**: Use EAS to build and deploy with your chosen theme

## 🔄 Switching Themes

To switch themes later:

1. **Update app.json** with new icon paths
2. **Rebuild your app** with EAS
3. **Test thoroughly** on different devices and themes
4. **Deploy updates** through app stores

## 📋 File Naming Convention

All icon files follow this pattern:

- **Dark Theme**: `icon.png`, `ios-icon-180.png`, etc.
- **Light Theme**: `icon-light.png`, `ios-icon-180-light.png`, etc.
- **Primary Theme**: `icon-primary.png`, `ios-icon-180-primary.png`, etc.
- **Gradient Theme**: `icon-gradient.png`, `ios-icon-180-gradient.png`, etc.

## ✨ Benefits of Multiple Themes

- **User Preference**: Match device theme settings
- **Brand Flexibility**: Different themes for different use cases
- **Professional Appearance**: Consistent branding across platforms
- **Accessibility**: Better visibility in different lighting conditions
- **Market Appeal**: Stand out in app stores with unique branding

---

**🎉 Your TRUK app now has professional, flexible icon branding that can adapt to any situation!**
