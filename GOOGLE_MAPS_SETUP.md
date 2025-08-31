# Google Maps API Setup Guide for TRUK App

## 🗺️ Overview

This guide will help you set up Google Maps API integration for your TRUK app, including:

- Directions API for route calculation
- Distance Matrix API for distance/duration calculations
- Geocoding API for address-to-coordinates conversion
- Places API for location search and autocomplete
- Maps JavaScript API for map display

## 📋 Prerequisites

1. **Google Cloud Console Account**: You already have this set up
2. **API Key**: You have "API key 4" created
3. **React Native App**: Your TRUK app is ready

## 🔧 Step 1: Configure Your API Key

### 1.1 Enable Required APIs

Go to your Google Cloud Console and enable these APIs:

1. **Directions API**
   - Navigate to: APIs & Services > Library
   - Search for "Directions API"
   - Click "Enable"

2. **Distance Matrix API**
   - Search for "Distance Matrix API"
   - Click "Enable"

3. **Geocoding API**
   - Search for "Geocoding API"
   - Click "Enable"

4. **Places API**
   - Search for "Places API"
   - Click "Enable"

5. **Maps JavaScript API**
   - Search for "Maps JavaScript API"
   - Click "Enable"

### 1.2 Restrict Your API Key

**IMPORTANT**: Your current API key is unrestricted. You should restrict it for security:

1. Go to: APIs & Services > Credentials
2. Click on "API key 4"
3. Under "Application restrictions":
   - Select "Android apps" for mobile app
   - Add your app's package name (check your `app.json`)
4. Under "API restrictions":
   - Select "Restrict key"
   - Select only the APIs you enabled above
5. Click "Save"

### 1.3 Get Your API Key

1. In the same page, click "Show key"
2. Copy the API key (it looks like: `AIzaSyC...`)

## 🔧 Step 2: Configure Your App

### 2.1 Add API Key to Environment Variables

Create or update your `.env` file in the root directory:

```bash
# Add this line to your .env file
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

**Replace `YOUR_ACTUAL_API_KEY_HERE` with your actual API key from Step 1.3**

### 2.2 Update Google Maps Configuration

Edit `src/constants/googleMaps.ts`:

```typescript
// Replace this line:
API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY_HERE',

// With your actual API key (or leave it as is if using environment variable):
API_KEY: 'AIzaSyC...', // Your actual key here
```

## 🔧 Step 3: Platform-Specific Setup

### 3.1 Android Setup

1. **Add API Key to Android Manifest**

   Edit `app.json` and add:

   ```json
   {
     "expo": {
       "android": {
         "config": {
           "googleMaps": {
             "apiKey": "YOUR_ACTUAL_API_KEY_HERE"
           }
         }
       }
     }
   }
   ```

2. **Add Permissions**

   In `app.json`, ensure you have:

   ```json
   {
     "expo": {
       "android": {
         "permissions": ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"]
       }
     }
   }
   ```

### 3.2 iOS Setup (if needed)

1. **Add API Key to iOS Config**

   In `app.json`:

   ```json
   {
     "expo": {
       "ios": {
         "config": {
           "googleMapsApiKey": "YOUR_ACTUAL_API_KEY_HERE"
         }
       }
     }
   }
   ```

2. **Add Permissions**

   ```json
   {
     "expo": {
       "ios": {
         "infoPlist": {
           "NSLocationWhenInUseUsageDescription": "This app needs access to location to show your position on the map and calculate routes."
         }
       }
     }
   }
   ```

## 🔧 Step 4: Test the Integration

### 4.1 Test Basic Map Display

1. Import the EnhancedMap component:

   ```typescript
   import EnhancedMap from '../components/common/EnhancedMap';
   ```

2. Use it in a screen:
   ```typescript
   <EnhancedMap
     showCurrentLocation={true}
     height={300}
     onLocationSelected={(location) => {
       console.log('Selected location:', location);
     }}
   />
   ```

### 4.2 Test Location Picker

1. Import the LocationPicker component:

   ```typescript
   import LocationPicker from '../components/common/LocationPicker';
   ```

2. Use it in a form:
   ```typescript
   <LocationPicker
     placeholder="Enter pickup location"
     onLocationSelected={(location) => {
       console.log('Selected location:', location);
     }}
     onAddressChange={(address) => {
       console.log('Address changed:', address);
     }}
   />
   ```

### 4.3 Test Google Maps Service

```typescript
import { googleMapsService } from '../services/googleMapsService';

// Test geocoding
const location = await googleMapsService.geocodeAddress('Nairobi, Kenya');
console.log('Geocoded location:', location);

// Test directions
const route = await googleMapsService.getDirections('Nairobi, Kenya', 'Mombasa, Kenya');
console.log('Route:', route);
```

## 🔧 Step 5: Usage Examples

### 5.1 Request Form with Location Picker

Update your `RequestForm.tsx` to use the new LocationPicker:

```typescript
import LocationPicker from '../common/LocationPicker';

// In your form:
<LocationPicker
  placeholder="Pickup location"
  value={fromLocation}
  onLocationSelected={(location) => {
    setFromLocation(location.address || '');
    setFromLocationCoords(location);
  }}
  onAddressChange={setFromLocation}
/>

<LocationPicker
  placeholder="Delivery location"
  value={toLocation}
  onLocationSelected={(location) => {
    setToLocation(location.address || '');
    setToLocationCoords(location);
  }}
  onAddressChange={setToLocation}
/>
```

### 5.2 Trip Details with Route Display

```typescript
import EnhancedMap from '../common/EnhancedMap';

// In your trip details screen:
<EnhancedMap
  origin={trip.origin}
  destination={trip.destination}
  showDirections={true}
  onRouteCalculated={(route) => {
    console.log('Route calculated:', route);
  }}
  height={400}
/>
```

### 5.3 Distance Calculation

```typescript
import { googleMapsService } from '../services/googleMapsService';

// Calculate distance between multiple points
const distances = await googleMapsService.getDistanceMatrix(
  ['Nairobi, Kenya', 'Mombasa, Kenya'],
  ['Kisumu, Kenya', 'Nakuru, Kenya'],
);
console.log('Distances:', distances);
```

## 🔧 Step 6: Error Handling

### 6.1 API Key Issues

If you get "API key not valid" errors:

1. Check that your API key is correct
2. Ensure the APIs are enabled in Google Cloud Console
3. Verify API restrictions are set correctly
4. Check billing is enabled (Google Maps APIs require billing)

### 6.2 Rate Limiting

Google Maps APIs have rate limits. Handle them gracefully:

```typescript
try {
  const route = await googleMapsService.getDirections(origin, destination);
} catch (error) {
  if (error.message.includes('OVER_QUERY_LIMIT')) {
    Alert.alert('Service temporarily unavailable', 'Please try again later.');
  } else {
    Alert.alert('Error', 'Failed to calculate route. Please try again.');
  }
}
```

## 🔧 Step 7: Production Considerations

### 7.1 Billing Setup

1. Enable billing in Google Cloud Console
2. Set up billing alerts
3. Monitor API usage

### 7.2 Security

1. Restrict API key to your app's package name
2. Use environment variables for API keys
3. Never commit API keys to version control

### 7.3 Performance

1. Cache frequently used routes
2. Implement request debouncing
3. Use appropriate zoom levels for maps

## 🎯 Next Steps

1. **Test all components** with your API key
2. **Integrate location picker** into your request forms
3. **Add route visualization** to trip details
4. **Implement distance calculations** for pricing
5. **Add location search** to transporter finder

## 📞 Support

If you encounter issues:

1. Check Google Cloud Console for API usage and errors
2. Verify your API key restrictions
3. Test with a simple API call first
4. Check the Google Maps API documentation

## 🔗 Useful Links

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [React Native Maps Documentation](https://github.com/react-native-maps/react-native-maps)
- [Google Places Autocomplete](https://github.com/FaridSafi/react-native-google-places-autocomplete)
- [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/)

---

**Remember**: Keep your API key secure and monitor your usage to avoid unexpected charges!



