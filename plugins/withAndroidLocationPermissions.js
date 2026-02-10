const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Config plugin to add proper Android location permission metadata for Google Play compliance
 *
 * This plugin ensures:
 * 1. Background location permission is properly declared
 * 2. Foreground service type is set to "location" (required for Android 10+)
 * 3. Permission rationale is clear for Google Play reviewers
 *
 * Google Play Requirements:
 * - Apps using ACCESS_BACKGROUND_LOCATION must declare foreground service type
 * - Must show prominent disclosure before requesting permission
 * - Must have valid use case for background location
 */
const withAndroidLocationPermissions = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    const androidManifest = modConfig.modResults;
    const { manifest } = androidManifest;

    // Ensure uses-permission declarations exist
    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    // Define required permissions with proper attributes
    const requiredPermissions = [
      {
        $: {
          "android:name": "android.permission.ACCESS_FINE_LOCATION",
        },
      },
      {
        $: {
          "android:name": "android.permission.ACCESS_COARSE_LOCATION",
        },
      },
      {
        $: {
          "android:name": "android.permission.ACCESS_BACKGROUND_LOCATION",
        },
      },
      {
        $: {
          "android:name": "android.permission.FOREGROUND_SERVICE",
        },
      },
      {
        $: {
          "android:name": "android.permission.FOREGROUND_SERVICE_LOCATION",
        },
      },
    ];

    // Add permissions if they don't exist
    requiredPermissions.forEach((permission) => {
      const permissionName = permission.$["android:name"];
      const exists = manifest["uses-permission"].some(
        (p) => p.$["android:name"] === permissionName,
      );

      if (!exists) {
        manifest["uses-permission"].push(permission);
        console.log(`✅ Added permission: ${permissionName}`);
      }
    });

    // Add foreground service declaration for location tracking
    if (!manifest.application || !manifest.application[0]) {
      return modConfig;
    }

    const application = manifest.application[0];

    // Ensure service array exists
    if (!application.service) {
      application.service = [];
    }

    // Check if location service already exists
    const locationServiceExists = application.service.some(
      (service) =>
        service.$ &&
        service.$["android:name"] ===
          "expo.modules.location.LocationTaskService",
    );

    // Add location service if it doesn't exist
    if (!locationServiceExists) {
      application.service.push({
        $: {
          "android:name": "expo.modules.location.LocationTaskService",
          "android:foregroundServiceType": "location",
          "android:exported": "false",
          "android:enabled": "true",
        },
      });
      console.log('✅ Added location foreground service with type="location"');
    } else {
      // Update existing service to ensure foregroundServiceType is set
      application.service.forEach((service) => {
        if (
          service.$ &&
          service.$["android:name"] ===
            "expo.modules.location.LocationTaskService"
        ) {
          service.$["android:foregroundServiceType"] = "location";
          console.log(
            '✅ Updated location service with foregroundServiceType="location"',
          );
        }
      });
    }

    // Add metadata for Google Play compliance
    if (!application["meta-data"]) {
      application["meta-data"] = [];
    }

    // Add metadata about location usage (helps with Play Store review)
    const locationMetadata = {
      $: {
        "android:name":
          "com.google.android.gms.location.background_location_usage",
        "android:value":
          "real-time tracking, delivery updates, route optimization",
      },
    };

    const metadataExists = application["meta-data"].some(
      (meta) =>
        meta.$["android:name"] ===
        "com.google.android.gms.location.background_location_usage",
    );

    if (!metadataExists) {
      application["meta-data"].push(locationMetadata);
      console.log("✅ Added location usage metadata for Google Play");
    }

    return modConfig;
  });
};

module.exports = withAndroidLocationPermissions;
