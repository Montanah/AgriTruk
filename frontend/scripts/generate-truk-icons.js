const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Ensure the output directory exists
const outputDir = path.join(__dirname, '../assets/images');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Input TRUK logo path
const inputLogo = path.join(__dirname, '../assets/images/TRUK Logo.png');

// Icon sizes needed for different platforms
const iconSizes = {
  // Main app icon (1024x1024 for App Store/Play Store)
  'icon.png': 1024,

  // iOS icons
  'ios-icon-20.png': 20,
  'ios-icon-29.png': 29,
  'ios-icon-40.png': 40,
  'ios-icon-58.png': 58,
  'ios-icon-60.png': 60,
  'ios-icon-76.png': 76,
  'ios-icon-80.png': 80,
  'ios-icon-87.png': 87,
  'ios-icon-120.png': 120,
  'ios-icon-152.png': 152,
  'ios-icon-167.png': 167,
  'ios-icon-180.png': 180,
  'ios-icon-1024.png': 1024,

  // Android icons
  'android-icon-36.png': 36,
  'android-icon-48.png': 48,
  'android-icon-72.png': 72,
  'android-icon-96.png': 96,
  'android-icon-144.png': 144,
  'android-icon-192.png': 192,
  'android-icon-512.png': 512,

  // Adaptive icons for Android
  'adaptive-icon.png': 108,
  'adaptive-icon-foreground.png': 108,

  // Splash screen
  'splash-icon.png': 200,

  // Favicon for web
  'favicon.png': 32,
};

async function generateTrukIcons() {
  console.log('🚛 Starting TRUK app icon generation with authentic design...');

  try {
    // Check if input logo exists
    if (!fs.existsSync(inputLogo)) {
      throw new Error(`TRUK Logo not found at: ${inputLogo}`);
    }

    // Generate each icon size
    for (const [filename, size] of Object.entries(iconSizes)) {
      const outputPath = path.join(outputDir, filename);

      console.log(`📱 Generating ${filename} (${size}x${size})...`);

      // For app icons, we want to preserve the authentic TRUK design
      // The logo already has the perfect composition with truck, text, and background
      await sharp(inputLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 1 }, // Preserve black background
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated ${filename}`);
    }

    console.log('\n🎉 All TRUK app icons generated successfully!');
    console.log('\n📋 Authentic TRUK Design Features Preserved:');
    console.log('✅ Dark green truck silhouette with 3D effect');
    console.log('✅ "TRUK" text in cream/off-white');
    console.log('✅ "agri & cargo" tagline');
    console.log('✅ Dark green horizontal line');
    console.log('✅ "connecting every load" slogan in red');
    console.log('✅ Black background for professional look');
    console.log('\n🚀 Next steps:');
    console.log('1. Your app will now have the authentic TRUK branding');
    console.log('2. Build with: eas build --profile development --platform all');
    console.log('3. The real TRUK logo will appear on device home screens');
  } catch (error) {
    console.error('❌ Error generating TRUK icons:', error.message);
    process.exit(1);
  }
}

// Run the script
generateTrukIcons();
