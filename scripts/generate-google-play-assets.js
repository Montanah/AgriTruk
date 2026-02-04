const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Output directory for Google Play assets
const outputDir = path.join(__dirname, "../google-play-assets");
const phoneScreenshotsDir = path.join(outputDir, "screenshots/phone");
const tabletScreenshotsDir = path.join(
  __dirname,
  "../google-play-assets/screenshots/tablet",
);

// Ensure directories exist
[outputDir, phoneScreenshotsDir, tabletScreenshotsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Input TRUK logo path
const inputLogo = path.join(__dirname, "../assets/images/truk-logo.png");

// Colors for TRUK branding
const trukColors = {
  primary: "#0F2B04", // Dark green
  secondary: "#27AE60", // Green
  accent: "#FF8C00", // Orange
  white: "#FFFFFF",
  background: "#F5F5F5",
};

async function generateAppIcon() {
  console.log("📱 Generating App Icon (512x512px)...");

  try {
    const logoBuffer = await sharp(inputLogo).png().toBuffer();
    const logoSize = 400; // Logo size within 512px icon
    const padding = 56; // Padding around logo

    // Create icon with white background
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp(logoBuffer)
            .resize(logoSize, logoSize, {
              fit: "contain",
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toBuffer(),
          left: padding,
          top: padding,
        },
      ])
      .png()
      .toFile(path.join(outputDir, "app-icon-512x512.png"));

    console.log("✅ App icon created: app-icon-512x512.png");
  } catch (error) {
    console.error("❌ Error generating app icon:", error);
  }
}

async function generateFeatureGraphic() {
  console.log("🎨 Generating Feature Graphic (1024x500px)...");

  try {
    const logoBuffer = await sharp(inputLogo).png().toBuffer();

    // Create feature graphic with gradient background
    const featureGraphic = sharp({
      create: {
        width: 1024,
        height: 500,
        channels: 4,
        background: { r: 15, g: 43, b: 4, alpha: 1 }, // Dark green background
      },
    });

    // Resize logo for feature graphic
    const logoWidth = 300;
    const logoHeight = 300;
    const resizedLogo = await sharp(logoBuffer)
      .resize(logoWidth, logoHeight, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    // Create gradient overlay
    const gradientSvg = `
      <svg width="1024" height="500">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0F2B04;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#27AE60;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0F2B04;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1024" height="500" fill="url(#grad)" />
      </svg>
    `;

    await featureGraphic
      .composite([
        {
          input: Buffer.from(gradientSvg),
          blend: "over",
        },
        {
          input: resizedLogo,
          left: 362, // Center horizontally: (1024 - 300) / 2
          top: 100, // Center vertically: (500 - 300) / 2
        },
      ])
      .png()
      .toFile(path.join(outputDir, "feature-graphic-1024x500.png"));

    console.log("✅ Feature graphic created: feature-graphic-1024x500.png");
  } catch (error) {
    console.error("❌ Error generating feature graphic:", error);
  }
}

async function generateScreenshotPlaceholders() {
  console.log("📸 Creating screenshot placeholders...");

  // Google Play screenshot requirements
  const screenshotSpecs = {
    phone: {
      portrait: [
        { width: 1080, height: 1920, name: "phone-portrait-1.png" },
        { width: 1080, height: 1920, name: "phone-portrait-2.png" },
        { width: 1080, height: 1920, name: "phone-portrait-3.png" },
        { width: 1080, height: 1920, name: "phone-portrait-4.png" },
        { width: 1080, height: 1920, name: "phone-portrait-5.png" },
      ],
      landscape: [
        { width: 1920, height: 1080, name: "phone-landscape-1.png" },
        { width: 1920, height: 1080, name: "phone-landscape-2.png" },
      ],
    },
    tablet: {
      portrait: [
        { width: 1200, height: 1920, name: "tablet-portrait-1.png" },
        { width: 1200, height: 1920, name: "tablet-portrait-2.png" },
        { width: 1200, height: 1920, name: "tablet-portrait-3.png" },
      ],
      landscape: [
        { width: 1920, height: 1200, name: "tablet-landscape-1.png" },
        { width: 1920, height: 1200, name: "tablet-landscape-2.png" },
      ],
    },
  };

  try {
    const logoBuffer = await sharp(inputLogo).png().toBuffer();

    // Generate phone screenshots
    for (const spec of screenshotSpecs.phone.portrait) {
      await createScreenshotPlaceholder(
        logoBuffer,
        spec.width,
        spec.height,
        path.join(phoneScreenshotsDir, spec.name),
        "portrait",
      );
    }

    for (const spec of screenshotSpecs.phone.landscape) {
      await createScreenshotPlaceholder(
        logoBuffer,
        spec.width,
        spec.height,
        path.join(phoneScreenshotsDir, spec.name),
        "landscape",
      );
    }

    // Generate tablet screenshots
    for (const spec of screenshotSpecs.tablet.portrait) {
      await createScreenshotPlaceholder(
        logoBuffer,
        spec.width,
        spec.height,
        path.join(tabletScreenshotsDir, spec.name),
        "portrait",
      );
    }

    for (const spec of screenshotSpecs.tablet.landscape) {
      await createScreenshotPlaceholder(
        logoBuffer,
        spec.width,
        spec.height,
        path.join(tabletScreenshotsDir, spec.name),
        "landscape",
      );
    }

    console.log("✅ Screenshot placeholders created");
  } catch (error) {
    console.error("❌ Error generating screenshots:", error);
  }
}

async function createScreenshotPlaceholder(
  logoBuffer,
  width,
  height,
  outputPath,
  orientation,
) {
  const logoSize = Math.min(width, height) * 0.3;

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 245, g: 245, b: 245, alpha: 1 }, // Light gray background
    },
  })
    .composite([
      {
        input: await sharp(logoBuffer)
          .resize(Math.floor(logoSize), Math.floor(logoSize), {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer(),
        left: Math.floor((width - logoSize) / 2),
        top: Math.floor((height - logoSize) / 2),
      },
      {
        input: Buffer.from(`
        <svg width="${width}" height="${height}">
          <text x="50%" y="${height * 0.7}" 
                font-family="Arial, sans-serif" 
                font-size="${Math.floor(height * 0.04)}" 
                fill="#666" 
                text-anchor="middle">
            Screenshot Placeholder - ${orientation}
          </text>
          <text x="50%" y="${height * 0.75}" 
                font-family="Arial, sans-serif" 
                font-size="${Math.floor(height * 0.025)}" 
                fill="#999" 
                text-anchor="middle">
            Replace with actual app screenshot
          </text>
          <text x="50%" y="${height * 0.8}" 
                font-family="Arial, sans-serif" 
                font-size="${Math.floor(height * 0.02)}" 
                fill="#999" 
                text-anchor="middle">
            ${width}x${height}px
          </text>
        </svg>
      `),
        blend: "over",
      },
    ])
    .png()
    .toFile(outputPath);
}

async function createReadme() {
  const readmeContent = `# Google Play Store Assets

This folder contains all required assets for Google Play Store submission.

## Required Assets

### 1. App Icon
- **File**: \`app-icon-512x512.png\`
- **Size**: 512x512px
- **Format**: PNG (no transparency)
- **Usage**: Upload as "App icon" in Google Play Console

### 2. Feature Graphic
- **File**: \`feature-graphic-1024x500.png\`
- **Size**: 1024x500px
- **Format**: PNG
- **Usage**: Upload as "Feature graphic" in Google Play Console

### 3. Screenshots

#### Phone Screenshots (Required: At least 2, Recommended: 4-8)
Located in: \`screenshots/phone/\`

**Portrait (9:16 ratio):**
- \`phone-portrait-1.png\` - 1080x1920px
- \`phone-portrait-2.png\` - 1080x1920px
- \`phone-portrait-3.png\` - 1080x1920px
- \`phone-portrait-4.png\` - 1080x1920px
- \`phone-portrait-5.png\` - 1080x1920px

**Landscape (16:9 ratio):**
- \`phone-landscape-1.png\` - 1920x1080px
- \`phone-landscape-2.png\` - 1920x1080px

#### Tablet Screenshots (Optional but Recommended)
Located in: \`screenshots/tablet/\`

**Portrait:**
- \`tablet-portrait-1.png\` - 1200x1920px
- \`tablet-portrait-2.png\` - 1200x1920px
- \`tablet-portrait-3.png\` - 1200x1920px

**Landscape:**
- \`tablet-landscape-1.png\` - 1920x1200px
- \`tablet-landscape-2.png\` - 1920x1200px

## How to Use

1. **Replace Screenshot Placeholders**: 
   - The screenshot files are placeholders with the TRUK logo
   - Replace them with actual screenshots from your app
   - Take screenshots on a real device or emulator
   - Ensure screenshots show key features and functionality

2. **Upload to Google Play Console**:
   - Go to Google Play Console → Your App → Store presence → Store listings
   - Upload the app icon (512x512px)
   - Upload the feature graphic (1024x500px)
   - Upload at least 2 phone screenshots (portrait or landscape)
   - Optionally upload tablet screenshots

## Screenshot Guidelines

- **Show key features**: Display main functionality, not just the home screen
- **Use real content**: Avoid placeholder text or empty states
- **Highlight benefits**: Show what makes your app valuable
- **Keep it simple**: Don't overcrowd screenshots with text overlays
- **Maintain consistency**: Use similar styling across all screenshots
- **Test on devices**: Ensure screenshots look good on different screen sizes

## Tips for Taking Screenshots

1. Use a real device or high-quality emulator
2. Ensure the device is in the correct orientation
3. Hide sensitive information (passwords, personal data)
4. Use the app's actual content, not placeholders
5. Consider adding text overlays to highlight features (optional)
6. Test screenshots on different devices before uploading

## File Structure

\`\`\`
google-play-assets/
├── app-icon-512x512.png
├── feature-graphic-1024x500.png
├── README.md
└── screenshots/
    ├── phone/
    │   ├── phone-portrait-1.png
    │   ├── phone-portrait-2.png
    │   ├── phone-portrait-3.png
    │   ├── phone-portrait-4.png
    │   ├── phone-portrait-5.png
    │   ├── phone-landscape-1.png
    │   └── phone-landscape-2.png
    └── tablet/
        ├── tablet-portrait-1.png
        ├── tablet-portrait-2.png
        ├── tablet-portrait-3.png
        ├── tablet-landscape-1.png
        └── tablet-landscape-2.png
\`\`\`

## Notes

- All images are PNG format for best quality
- App icon must have no transparency (solid background)
- Screenshots can be replaced with actual app screenshots
- Minimum requirements: App icon + Feature graphic + 2 phone screenshots
- Recommended: All assets including tablet screenshots for better visibility
`;

  fs.writeFileSync(path.join(outputDir, "README.md"), readmeContent);
  console.log("✅ README.md created");
}

async function main() {
  console.log("🚀 Generating Google Play Store Assets...\n");

  // Check if logo exists
  if (!fs.existsSync(inputLogo)) {
    console.error(`❌ Logo not found: ${inputLogo}`);
    console.error("Please ensure truk-logo.png exists in assets/images/");
    process.exit(1);
  }

  await generateAppIcon();
  await generateFeatureGraphic();
  await generateScreenshotPlaceholders();
  await createReadme();

  console.log("\n✅ All Google Play Store assets generated successfully!");
  console.log(`📁 Assets location: ${outputDir}`);
  console.log("\n📝 Next steps:");
  console.log("1. Replace screenshot placeholders with actual app screenshots");
  console.log("2. Review all assets for quality");
  console.log("3. Upload to Google Play Console");
  console.log(
    "\n📖 See README.md in the google-play-assets folder for detailed instructions",
  );
}

main().catch(console.error);
