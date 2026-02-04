const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Ensure the output directory exists
const outputDir = path.join(__dirname, "../assets/images");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Input TRUK logo path
const inputLogo = path.join(__dirname, "../assets/images/truk-logo.png");

// Icon sizes needed for different platforms
const iconSizes = {
  // Main app icon (1024x1024 for App Store/Play Store)
  "icon.png": 1024,

  // iOS icons
  "ios-icon-20.png": 20,
  "ios-icon-29.png": 29,
  "ios-icon-40.png": 40,
  "ios-icon-58.png": 58,
  "ios-icon-60.png": 60,
  "ios-icon-76.png": 76,
  "ios-icon-80.png": 80,
  "ios-icon-87.png": 87,
  "ios-icon-120.png": 120,
  "ios-icon-152.png": 152,
  "ios-icon-167.png": 167,
  "ios-icon-180.png": 180,
  "ios-icon-1024.png": 1024,

  // Android icons
  "android-icon-36.png": 36,
  "android-icon-48.png": 48,
  "android-icon-72.png": 72,
  "android-icon-96.png": 96,
  "android-icon-144.png": 144,
  "android-icon-192.png": 192,
  "android-icon-512.png": 512,

  // Adaptive icons for Android
  "adaptive-icon.png": 108,
  "adaptive-icon-foreground.png": 108,

  // Splash screen
  "splash-icon.png": 200,

  // Favicon for web
  "favicon.png": 32,
};

// Generate variant icons with different backgrounds
const variants = {
  primary: { background: { r: 26, g: 115, b: 232, alpha: 1 }, name: "primary" }, // Blue
  secondary: {
    background: { r: 34, g: 197, b: 94, alpha: 1 },
    name: "secondary",
  }, // Green
  accent: { background: { r: 168, g: 85, b: 247, alpha: 1 }, name: "accent" }, // Purple
  surface: {
    background: { r: 107, g: 114, b: 128, alpha: 1 },
    name: "surface",
  }, // Gray
  light: { background: { r: 248, g: 250, b: 252, alpha: 1 }, name: "light" }, // Light gray
  gradient: {
    background: { r: 255, g: 255, b: 255, alpha: 1 },
    name: "gradient",
  }, // White
};

async function generateProfessionalTrukIcons() {
  console.log("🚛 Starting Professional TRUK app icon generation...");

  try {
    // Check if input logo exists
    if (!fs.existsSync(inputLogo)) {
      throw new Error(`TRUK Logo not found at: ${inputLogo}`);
    }

    // Generate each variant
    for (const [variantKey, variant] of Object.entries(variants)) {
      console.log(`\n🎨 Generating ${variant.name} variant...`);

      // Generate each icon size for this variant
      for (const [filename, size] of Object.entries(iconSizes)) {
        const baseFilename = filename.replace(".png", "");
        const outputFilename = `${baseFilename}-${variant.name}.png`;
        const outputPath = path.join(outputDir, outputFilename);

        console.log(`📱 Generating ${outputFilename} (${size}x${size})...`);

        // Create a professional icon with the specified background
        await sharp(inputLogo)
          .resize(size, size, {
            fit: "contain",
            background: variant.background,
            position: "center",
          })
          .png()
          .toFile(outputPath);

        console.log(`✅ Generated ${outputFilename}`);
      }
    }

    // Generate the main white background icons (default)
    console.log("\n🎨 Generating default white background icons...");
    for (const [filename, size] of Object.entries(iconSizes)) {
      const outputPath = path.join(outputDir, filename);

      console.log(`📱 Generating ${filename} (${size}x${size})...`);

      // Create professional white background icon
      await sharp(inputLogo)
        .resize(size, size, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 }, // Pure white background
          position: "center",
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated ${filename}`);
    }

    console.log("\n🎉 All Professional TRUK app icons generated successfully!");
    console.log("\n📋 Professional Design Features:");
    console.log("✅ Clean white background for modern look");
    console.log("✅ High-quality TRUK logo with proper scaling");
    console.log("✅ Multiple color variants for different themes");
    console.log("✅ Optimized for both iOS and Android");
    console.log("✅ Professional appearance on all devices");
    console.log("\n🚀 Next steps:");
    console.log("1. Update app.config.js to use the new icons");
    console.log(
      "2. Build with: eas build --profile development --platform all",
    );
    console.log(
      "3. The professional TRUK logo will appear on device home screens",
    );
  } catch (error) {
    console.error(
      "❌ Error generating Professional TRUK icons:",
      error.message,
    );
    process.exit(1);
  }
}

// Run the script
generateProfessionalTrukIcons();
