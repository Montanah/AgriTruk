const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to fix Google Play Console recommendations:
 * 1. Remove orientation restrictions for large screen devices
 * 2. Ensure proper edge-to-edge support
 * 3. Enable resizable activity for large screens
 */
const withAndroidLargeScreenSupport = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application || !manifest.application[0]) {
      return config;
    }

    const application = manifest.application[0];
    
    // Find MainActivity
    if (application.activity) {
      application.activity.forEach((activity) => {
        if (activity.$ && activity.$['android:name'] === '.MainActivity') {
          // Remove screenOrientation restriction for large screen support
          // Keep portrait for phones but allow system to handle large screens
          if (activity.$['android:screenOrientation']) {
            // For large screens, we want to allow orientation changes
            // Remove the hardcoded portrait restriction
            delete activity.$['android:screenOrientation'];
          }

          // Ensure configChanges includes all necessary flags for edge-to-edge
          if (activity.$['android:configChanges']) {
            const configChanges = activity.$['android:configChanges'];
            // Ensure all necessary flags are present for edge-to-edge
            const requiredFlags = [
              'keyboard',
              'keyboardHidden',
              'orientation',
              'screenSize',
              'screenLayout',
              'uiMode',
              'smallestScreenSize',
              'density'
            ];
            
            const existingFlags = configChanges.split('|');
            const missingFlags = requiredFlags.filter(
              flag => !existingFlags.includes(flag)
            );
            
            if (missingFlags.length > 0) {
              activity.$['android:configChanges'] = [
                ...existingFlags,
                ...missingFlags
              ].join('|');
            }
          }

          // Ensure resizeableActivity is set (for large screen support)
          if (!activity.$['android:resizeableActivity']) {
            activity.$['android:resizeableActivity'] = 'true';
          }
        }
      });
    }

    return config;
  });
};

module.exports = withAndroidLargeScreenSupport;
