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

// White background for all app icons (iOS and Android)
const productionColors = {
  white: { r: 255, g: 255, b: 255, alpha: 1 }, // #FFFFFF - Pure White (Primary)
  light: { r: 248, g: 250, b: 252, alpha: 1 }, // #F8FAFC - Light Gray
  surface: { r: 240, g: 240, b: 240, alpha: 1 }, // #F0F0F0 - Light Surface
  background: { r: 247, g: 249, b: 252, alpha: 1 }, // #F7F9FC - Light Gray
  primary: { r: 255, g: 255, b: 255, alpha: 1 }, // #FFFFFF - Pure White (Default)
  secondary: { r: 255, g: 255, b: 255, alpha: 1 }, // #FFFFFF - Pure White
  tertiary: { r: 255, g: 255, b: 255, alpha: 1 }, // #FFFFFF - Pure White
};

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

async function generateProductionIcons() {
  console.log("🚛 Starting Production TRUK app icon generation...");
  console.log(
    "📱 Creating professional, market-ready icons with proper spacing",
  );

  try {
    // Check if input logo exists
    if (!fs.existsSync(inputLogo)) {
      throw new Error(`Input logo not found: ${inputLogo}`);
    }

    // Load the original logo
    const logoBuffer = await sharp(inputLogo).png().toBuffer();
    const logoMetadata = await sharp(logoBuffer).metadata();

    console.log(
      `📐 Original logo dimensions: ${logoMetadata.width}x${logoMetadata.height}`,
    );

    // Generate icons for each color variant
    for (const [colorName, color] of Object.entries(productionColors)) {
      console.log(`\n🎨 Generating ${colorName} variant...`);

      for (const [filename, size] of Object.entries(iconSizes)) {
        const outputPath = path.join(
          outputDir,
          filename.replace(".png", `-${colorName}.png`),
        );

        // Calculate proper spacing - logo should be 85% of icon size for better visibility
        const logoSize = Math.floor(size * 0.85);
        const padding = Math.floor((size - logoSize) / 2);

        // Resize the logo to fit properly
        const resizedLogoBuffer = await sharp(logoBuffer)
          .resize(logoSize, logoSize, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer();

        // Create the icon with proper spacing
        await sharp({
          create: {
            width: size,
            height: size,
            channels: 4,
            background: color,
          },
        })
          .composite([
            {
              input: resizedLogoBuffer,
              top: padding,
              left: padding,
              blend: "over",
            },
          ])
          .png({ quality: 100, compressionLevel: 9 })
          .toFile(outputPath);

        console.log(
          `  ✅ Generated ${filename.replace(".png", `-${colorName}.png`)} (${size}x${size})`,
        );
      }
    }

    // Generate the default icons (using primary color)
    console.log(`\n🎯 Generating default icons (primary color)...`);
    for (const [filename, size] of Object.entries(iconSizes)) {
      const outputPath = path.join(outputDir, filename);
      const color = productionColors.white;

      // Calculate proper spacing
      const logoSize = Math.floor(size * 0.85);
      const padding = Math.floor((size - logoSize) / 2);

      // Resize the logo to fit properly
      const resizedLogoBuffer = await sharp(logoBuffer)
        .resize(logoSize, logoSize, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: color,
        },
      })
        .composite([
          {
            input: resizedLogoBuffer,
            top: padding,
            left: padding,
            blend: "over",
          },
        ])
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);

      console.log(`  ✅ Generated ${filename} (${size}x${size})`);
    }

    // Generate special Android adaptive icons
    console.log(`\n🤖 Generating Android adaptive icons...`);
    for (const [colorName, color] of Object.entries(productionColors)) {
      const adaptiveSize = 108;
      const logoSize = Math.floor(adaptiveSize * 0.8); // Larger for adaptive icons
      const padding = Math.floor((adaptiveSize - logoSize) / 2);

      // Resize logo for adaptive icons
      const resizedLogoBuffer = await sharp(logoBuffer)
        .resize(logoSize, logoSize, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      // Foreground (just the logo)
      const foregroundPath = path.join(
        outputDir,
        `adaptive-icon-foreground-${colorName}.png`,
      );
      await sharp({
        create: {
          width: adaptiveSize,
          height: adaptiveSize,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent
        },
      })
        .composite([
          {
            input: resizedLogoBuffer,
            top: padding,
            left: padding,
            blend: "over",
          },
        ])
        .png({ quality: 100 })
        .toFile(foregroundPath);

      // Full adaptive icon
      const adaptivePath = path.join(
        outputDir,
        `adaptive-icon-${colorName}.png`,
      );
      await sharp({
        create: {
          width: adaptiveSize,
          height: adaptiveSize,
          channels: 4,
          background: color,
        },
      })
        .composite([
          {
            input: resizedLogoBuffer,
            top: padding,
            left: padding,
            blend: "over",
          },
        ])
        .png({ quality: 100 })
        .toFile(adaptivePath);

      console.log(`  ✅ Generated adaptive-icon-${colorName}.png`);
    }

    // Generate default adaptive icons
    const adaptiveSize = 108;
    const logoSize = Math.floor(adaptiveSize * 0.8);
    const padding = Math.floor((adaptiveSize - logoSize) / 2);
    const color = productionColors.white;

    // Resize logo for default adaptive icons
    const resizedLogoBuffer = await sharp(logoBuffer)
      .resize(logoSize, logoSize, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    // Default foreground
    await sharp({
      create: {
        width: adaptiveSize,
        height: adaptiveSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: resizedLogoBuffer,
          top: padding,
          left: padding,
          blend: "over",
        },
      ])
      .png({ quality: 100 })
      .toFile(path.join(outputDir, "adaptive-icon-foreground.png"));

    // Default adaptive icon
    await sharp({
      create: {
        width: adaptiveSize,
        height: adaptiveSize,
        channels: 4,
        background: color,
      },
    })
      .composite([
        {
          input: resizedLogoBuffer,
          top: padding,
          left: padding,
          blend: "over",
        },
      ])
      .png({ quality: 100 })
      .toFile(path.join(outputDir, "adaptive-icon.png"));

    console.log(`\n🎉 Production icon generation completed successfully!`);
    console.log(
      `📊 Generated ${Object.keys(iconSizes).length * (Object.keys(productionColors).length + 1)} total icons`,
    );
    console.log(
      `🎨 Color variants: ${Object.keys(productionColors).join(", ")}`,
    );
    console.log(`📱 Platforms: iOS, Android, Web`);
    console.log(`\n💡 Key improvements:`);
    console.log(`   • Logo is now 85% of icon size (improved visibility)`);
    console.log(`   • Proper padding ensures logo doesn't touch edges`);
    console.log(`   • High-quality PNG compression for crisp display`);
    console.log(`   • White background for both iOS and Android`);
    console.log(`   • Optimized for both light and dark themes`);
  } catch (error) {
    console.error("❌ Error generating production icons:", error);
    process.exit(1);
  }
}

// Run the icon generation
generateProductionIcons();
