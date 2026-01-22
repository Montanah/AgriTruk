# Google Play Store Assets

This folder contains all required assets for Google Play Store submission.

## Required Assets

### 1. App Icon
- **File**: `app-icon-512x512.png`
- **Size**: 512x512px
- **Format**: PNG (no transparency)
- **Usage**: Upload as "App icon" in Google Play Console

### 2. Feature Graphic
- **File**: `feature-graphic-1024x500.png`
- **Size**: 1024x500px
- **Format**: PNG
- **Usage**: Upload as "Feature graphic" in Google Play Console

### 3. Screenshots

#### Phone Screenshots (Required: At least 2, Recommended: 4-8)
Located in: `screenshots/phone/`

**Portrait (9:16 ratio):**
- `phone-portrait-1.png` - 1080x1920px
- `phone-portrait-2.png` - 1080x1920px
- `phone-portrait-3.png` - 1080x1920px
- `phone-portrait-4.png` - 1080x1920px
- `phone-portrait-5.png` - 1080x1920px

**Landscape (16:9 ratio):**
- `phone-landscape-1.png` - 1920x1080px
- `phone-landscape-2.png` - 1920x1080px

#### Tablet Screenshots (Optional but Recommended)
Located in: `screenshots/tablet/`

**Portrait:**
- `tablet-portrait-1.png` - 1200x1920px
- `tablet-portrait-2.png` - 1200x1920px
- `tablet-portrait-3.png` - 1200x1920px

**Landscape:**
- `tablet-landscape-1.png` - 1920x1200px
- `tablet-landscape-2.png` - 1920x1200px

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

```
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
```

## Notes

- All images are PNG format for best quality
- App icon must have no transparency (solid background)
- Screenshots can be replaced with actual app screenshots
- Minimum requirements: App icon + Feature graphic + 2 phone screenshots
- Recommended: All assets including tablet screenshots for better visibility
