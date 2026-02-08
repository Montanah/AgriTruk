const express = require('express');
const router = express.Router();
const TrafficController = require('../controllers/trafficController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');

// All traffic routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/traffic/conditions:
 *   post:
 *     summary: Get traffic conditions for a specific area
 *     tags: [Traffic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - center
 *             properties:
 *               center:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     example: -1.2921
 *                   longitude:
 *                     type: number
 *                     example: 36.8219
 *               radius:
 *                 type: number
 *                 default: 5000
 *                 example: 10000
 *     responses:
 *       200:
 *         description: Traffic conditions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 conditions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [congestion, accident, road_closure, construction, weather, event]
 *                       severity:
 *                         type: string
 *                         enum: [low, medium, high, critical]
 *                       description:
 *                         type: string
 *                       location:
 *                         type: object
 *                         properties:
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
 *                           address:
 *                             type: string
 *                           radius:
 *                             type: number
 *                       impact:
 *                         type: object
 *                         properties:
 *                           delay:
 *                             type: number
 *                           speed:
 *                             type: number
 *                           affectedLanes:
 *                             type: number
 *                       duration:
 *                         type: object
 *                         properties:
 *                           start:
 *                             type: string
 *                             format: date-time
 *                           estimatedEnd:
 *                             type: string
 *                             format: date-time
 *                 count:
 *                   type: number
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/conditions', requireRole(['admin', 'shipper', 'business', 'broker', 'transporter']), TrafficController.getTrafficConditions);

/**
 * @swagger
 * /api/traffic/alternative-routes:
 *   post:
 *     summary: Get alternative routes for a given path
 *     tags: [Traffic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *             properties:
 *               origin:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               destination:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               currentRoute:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *     responses:
 *       200:
 *         description: Alternative routes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 routes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       coordinates:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             latitude:
 *                               type: number
 *                             longitude:
 *                               type: number
 *                       distance:
 *                         type: number
 *                       estimatedTime:
 *                         type: number
 *                       trafficLevel:
 *                         type: string
 *                         enum: [low, medium, high]
 *                       tolls:
 *                         type: boolean
 *                       roadType:
 *                         type: string
 *                         enum: [highway, arterial, local]
 *                       restrictions:
 *                         type: array
 *                         items:
 *                           type: string
 *                       advantages:
 *                         type: array
 *                         items:
 *                           type: string
 *                       disadvantages:
 *                         type: array
 *                         items:
 *                           type: string
 *                 count:
 *                   type: number
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/alternative-routes', requireRole(['admin', 'shipper', 'business', 'broker', 'transporter']), TrafficController.getAlternativeRoutes);

/**
 * @swagger
 * /api/traffic/optimize-route:
 *   post:
 *     summary: Optimize route based on current traffic conditions
 *     tags: [Traffic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *             properties:
 *               origin:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               destination:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               preferences:
 *                 type: object
 *                 properties:
 *                   avoidTolls:
 *                     type: boolean
 *                   avoidHighways:
 *                     type: boolean
 *                   preferHighways:
 *                     type: boolean
 *                   maxDistanceIncrease:
 *                     type: number
 *                   maxTimeIncrease:
 *                     type: number
 *     responses:
 *       200:
 *         description: Route optimized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 originalRoute:
 *                   type: object
 *                   properties:
 *                     coordinates:
 *                       type: array
 *                     distance:
 *                       type: number
 *                     estimatedTime:
 *                       type: number
 *                     trafficLevel:
 *                       type: string
 *                 optimizedRoute:
 *                   type: object
 *                   properties:
 *                     coordinates:
 *                       type: array
 *                     distance:
 *                       type: number
 *                     estimatedTime:
 *                       type: number
 *                     trafficLevel:
 *                       type: string
 *                     timeSaved:
 *                       type: number
 *                     distanceChange:
 *                       type: number
 *                 trafficConditions:
 *                   type: array
 *                 recommendations:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: string
 *                       enum: [take_alternative, wait, proceed, reschedule]
 *                     reason:
 *                       type: string
 *                     confidence:
 *                       type: number
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/optimize-route', requireRole(['admin', 'shipper', 'business', 'broker', 'transporter']), TrafficController.optimizeRoute);

/**
 * @swagger
 * /api/traffic/route-alerts:
 *   post:
 *     summary: Get real-time traffic alerts for a specific route
 *     tags: [Traffic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - route
 *             properties:
 *               route:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *               buffer:
 *                 type: number
 *                 default: 1000
 *     responses:
 *       200:
 *         description: Route traffic alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 alerts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       severity:
 *                         type: string
 *                       description:
 *                         type: string
 *                       location:
 *                         type: object
 *                       impact:
 *                         type: object
 *                       duration:
 *                         type: object
 *                 count:
 *                   type: number
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/route-alerts', requireRole(['admin', 'shipper', 'business', 'broker', 'transporter']), TrafficController.getRouteTrafficAlerts);

/**
 * @swagger
 * /api/traffic/forecast:
 *   post:
 *     summary: Get traffic forecast for a specific time
 *     tags: [Traffic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *               - departureTime
 *             properties:
 *               origin:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               destination:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Traffic forecast retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 estimatedTime:
 *                   type: number
 *                 confidence:
 *                   type: number
 *                 factors:
 *                   type: array
 *                   items:
 *                     type: string
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/forecast', requireRole(['admin', 'shipper', 'business', 'broker', 'transporter']), TrafficController.getTrafficForecast);

module.exports = router;

