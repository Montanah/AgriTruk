const { API_ENDPOINTS } = require('../constants/api');

class TrafficController {
  /**
   * Get traffic conditions for a specific area
   * POST /api/traffic/conditions
   */
  async getTrafficConditions(req, res) {
    try {
      const { center, radius = 5000, userType = 'client' } = req.body;
      
      if (!center || !center.latitude || !center.longitude) {
        return res.status(400).json({
          success: false,
          message: 'Center coordinates are required'
        });
      }

      // Mock traffic data - in production, this would integrate with real traffic APIs
      const mockTrafficConditions = [
        {
          id: 'traffic-1',
          type: 'congestion',
          severity: 'medium',
          description: 'Heavy traffic on Ngong Road',
          location: {
            latitude: -1.3000,
            longitude: 36.8000,
            address: 'Ngong Road, Nairobi',
            radius: 1000
          },
          impact: {
            delay: 15,
            speed: 25,
            affectedLanes: 2
          },
          duration: {
            start: new Date().toISOString(),
            estimatedEnd: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          },
          alternativeRoutes: [
            {
              id: 'alt-1',
              name: 'Via Langata Road',
              coordinates: [
                { latitude: -1.2921, longitude: 36.8219 },
                { latitude: -1.2800, longitude: 36.8200 },
                { latitude: -1.3500, longitude: 36.7500 },
                { latitude: -1.3733, longitude: 36.6883 }
              ],
              distance: 18.5,
              estimatedTime: 35,
              trafficLevel: 'low',
              tolls: false,
              roadType: 'arterial',
              restrictions: [],
              advantages: ['Less traffic', 'Scenic route'],
              disadvantages: ['Longer distance']
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'traffic-2',
          type: 'accident',
          severity: 'high',
          description: 'Vehicle accident on Mombasa Road',
          location: {
            latitude: -1.3200,
            longitude: 36.7800,
            address: 'Mombasa Road, Nairobi',
            radius: 500
          },
          impact: {
            delay: 30,
            speed: 15,
            affectedLanes: 3
          },
          duration: {
            start: new Date().toISOString(),
            estimatedEnd: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
          },
          alternativeRoutes: [
            {
              id: 'alt-2',
              name: 'Via Outer Ring Road',
              coordinates: [
                { latitude: -1.2921, longitude: 36.8219 },
                { latitude: -1.2500, longitude: 36.8500 },
                { latitude: -1.2000, longitude: 36.8000 },
                { latitude: -1.3733, longitude: 36.6883 }
              ],
              distance: 22.0,
              estimatedTime: 40,
              trafficLevel: 'medium',
              tolls: true,
              roadType: 'highway',
              restrictions: ['Heavy vehicles only'],
              advantages: ['Faster route', 'Less congestion'],
              disadvantages: ['Toll fees', 'Longer distance']
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // Filter conditions within radius
      const conditionsInRadius = mockTrafficConditions.filter(condition => {
        const distance = calculateDistance(
          center.latitude,
          center.longitude,
          condition.location.latitude,
          condition.location.longitude
        );
        return distance <= (radius / 1000); // Convert radius to km
      });

      // Format response based on user type
      let responseConditions = conditionsInRadius;
      
      if (userType === 'client') {
        // For clients, provide user-friendly messages and remove alternative routes
        responseConditions = conditionsInRadius.map(condition => ({
          ...condition,
          message: this.getClientFriendlyMessage(condition),
          alternativeRoutes: undefined // Clients don't need route selection
        }));
      }

      res.json({
        success: true,
        conditions: responseConditions,
        count: responseConditions.length
      });
    } catch (error) {
      console.error('Error fetching traffic conditions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch traffic conditions'
      });
    }
  }

  /**
   * Get alternative routes for a given path
   * POST /api/traffic/alternative-routes
   */
  async getAlternativeRoutes(req, res) {
    try {
      const { origin, destination, currentRoute } = req.body;
      
      if (!origin || !destination) {
        return res.status(400).json({
          success: false,
          message: 'Origin and destination are required'
        });
      }

      // Mock alternative routes - in production, this would use routing APIs
      const alternativeRoutes = [
        {
          id: 'route-1',
          name: 'Fastest Route',
          coordinates: [
            { latitude: origin.latitude, longitude: origin.longitude },
            { latitude: -1.3000, longitude: 36.8000 },
            { latitude: -1.3500, longitude: 36.7500 },
            { latitude: destination.latitude, longitude: destination.longitude }
          ],
          distance: 15.2,
          estimatedTime: 25,
          trafficLevel: 'low',
          tolls: false,
          roadType: 'arterial',
          restrictions: [],
          advantages: ['Fastest time', 'Direct route'],
          disadvantages: ['May have traffic during peak hours']
        },
        {
          id: 'route-2',
          name: 'Scenic Route',
          coordinates: [
            { latitude: origin.latitude, longitude: origin.longitude },
            { latitude: -1.2800, longitude: 36.8200 },
            { latitude: -1.3200, longitude: 36.7800 },
            { latitude: destination.latitude, longitude: destination.longitude }
          ],
          distance: 18.5,
          estimatedTime: 35,
          trafficLevel: 'low',
          tolls: false,
          roadType: 'local',
          restrictions: [],
          advantages: ['Scenic views', 'Less traffic'],
          disadvantages: ['Longer distance', 'Slower speed limits']
        },
        {
          id: 'route-3',
          name: 'Highway Route',
          coordinates: [
            { latitude: origin.latitude, longitude: origin.longitude },
            { latitude: -1.2500, longitude: 36.8500 },
            { latitude: -1.2000, longitude: 36.8000 },
            { latitude: destination.latitude, longitude: destination.longitude }
          ],
          distance: 22.0,
          estimatedTime: 30,
          trafficLevel: 'medium',
          tolls: true,
          roadType: 'highway',
          restrictions: ['Heavy vehicles only'],
          advantages: ['Consistent speed', 'Less stops'],
          disadvantages: ['Toll fees', 'Longer distance']
        }
      ];

      res.json({
        success: true,
        routes: alternativeRoutes,
        count: alternativeRoutes.length
      });
    } catch (error) {
      console.error('Error fetching alternative routes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch alternative routes'
      });
    }
  }

  /**
   * Optimize route based on current traffic conditions
   * POST /api/traffic/optimize-route
   */
  async optimizeRoute(req, res) {
    try {
      const { origin, destination, preferences = {} } = req.body;
      
      if (!origin || !destination) {
        return res.status(400).json({
          success: false,
          message: 'Origin and destination are required'
        });
      }

      // Mock route optimization - in production, this would use advanced routing algorithms
      const originalRoute = {
        coordinates: [
          { latitude: origin.latitude, longitude: origin.longitude },
          { latitude: -1.3000, longitude: 36.8000 },
          { latitude: destination.latitude, longitude: destination.longitude }
        ],
        distance: 15.2,
        estimatedTime: 25,
        trafficLevel: 'high'
      };

      const optimizedRoute = {
        coordinates: [
          { latitude: origin.latitude, longitude: origin.longitude },
          { latitude: -1.2800, longitude: 36.8200 },
          { latitude: -1.3500, longitude: 36.7500 },
          { latitude: destination.latitude, longitude: destination.longitude }
        ],
        distance: 18.5,
        estimatedTime: 20,
        trafficLevel: 'low',
        timeSaved: 5,
        distanceChange: 3.3
      };

      const trafficConditions = [
        {
          id: 'traffic-1',
          type: 'congestion',
          severity: 'high',
          description: 'Heavy traffic on original route',
          location: {
            latitude: -1.3000,
            longitude: 36.8000,
            address: 'Ngong Road, Nairobi'
          }
        }
      ];

      const recommendations = {
        action: 'take_alternative',
        reason: 'Heavy traffic detected on original route',
        confidence: 85
      };

      res.json({
        success: true,
        originalRoute,
        optimizedRoute,
        trafficConditions,
        recommendations
      });
    } catch (error) {
      console.error('Error optimizing route:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to optimize route'
      });
    }
  }

  /**
   * Get real-time traffic alerts for a specific route
   * POST /api/traffic/route-alerts
   */
  async getRouteTrafficAlerts(req, res) {
    try {
      const { route, buffer = 1000 } = req.body;
      
      if (!route || !Array.isArray(route)) {
        return res.status(400).json({
          success: false,
          message: 'Route array is required'
        });
      }

      // Mock route alerts - in production, this would analyze the route against real traffic data
      const routeAlerts = [
        {
          id: 'alert-1',
          type: 'congestion',
          severity: 'medium',
          description: 'Moderate traffic on route segment',
          location: {
            latitude: -1.3000,
            longitude: 36.8000,
            address: 'Ngong Road, Nairobi'
          },
          impact: {
            delay: 10,
            speed: 30
          },
          duration: {
            start: new Date().toISOString(),
            estimatedEnd: new Date(Date.now() + 30 * 60 * 1000).toISOString()
          }
        }
      ];

      res.json({
        success: true,
        alerts: routeAlerts,
        count: routeAlerts.length
      });
    } catch (error) {
      console.error('Error fetching route traffic alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch route traffic alerts'
      });
    }
  }

  /**
   * Get traffic forecast for a specific time
   * POST /api/traffic/forecast
   */
  async getTrafficForecast(req, res) {
    try {
      const { origin, destination, departureTime } = req.body;
      
      if (!origin || !destination || !departureTime) {
        return res.status(400).json({
          success: false,
          message: 'Origin, destination, and departure time are required'
        });
      }

      // Mock traffic forecast - in production, this would use historical data and ML models
      const forecast = {
        estimatedTime: 28,
        confidence: 75,
        factors: [
          'Peak hour traffic',
          'Weather conditions',
          'Road construction',
          'Special events'
        ],
        recommendations: [
          'Leave 10 minutes earlier to avoid peak traffic',
          'Consider alternative route via Langata Road',
          'Check weather conditions before departure'
        ]
      };

      res.json({
        success: true,
        ...forecast
      });
    } catch (error) {
      console.error('Error fetching traffic forecast:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch traffic forecast'
      });
    }
  }

  /**
   * Convert technical traffic condition to client-friendly message
   */
  getClientFriendlyMessage(condition) {
    switch (condition.type) {
      case 'congestion':
        return `Heavy traffic on ${condition.location.address} - may cause delays`;
      case 'accident':
        return `Accident reported on ${condition.location.address} - expect delays`;
      case 'road_closure':
        return `Road closure on ${condition.location.address} - alternative route being used`;
      case 'construction':
        return `Road construction on ${condition.location.address} - reduced speed expected`;
      case 'weather':
        return `Weather conditions affecting ${condition.location.address} - delivery may be slower`;
      case 'event':
        return `Special event near ${condition.location.address} - traffic may be heavier`;
      default:
        return `Traffic condition on ${condition.location.address} - may affect delivery time`;
    }
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

module.exports = new TrafficController();
