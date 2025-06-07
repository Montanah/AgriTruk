const admin = require("../config/firebase");

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.sendStatus(401).json({
            code: 'ERR_NO_TOKEN',
            message: "Unauthorized!! No token provided"
        });
    }

    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({
        code: 'MISSING_TOKEN',
        message: "Authorization token required"
        });
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (err) {
       console.error('Token verification error:', err);
       return res.status(403).json({
         code: 'INVALID_TOKEN',
         message: "Invalid or expired token"
       });
    }
};

module.exports = {
  authenticateToken
};