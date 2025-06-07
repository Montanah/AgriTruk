const admin = require("../config/firebase");

exports.verifyUser = async (req, res) => {
    const { email, phone, password } = req.body;

    try {
        let user;
        if  (email && password) {
            user = await admin.auth().getUserByEmail(email);
        } else if (phone) {
        user = await admin.auth().getUserByPhoneNumber(phone);
        } else {
        return res.status(400).json({
            code: 'ERR_INVALID_INPUT',
            message: 'Email/password or phone number required'
        });
        }

        // Generate custom token for client (if needed)
        const customToken = await admin.auth().createCustomToken(user.uid);

        // Fetch user data from Firestore
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(user.uid)
            .get();

        if (!userDoc.exists) {
            return res.status(404).json({
                code: 'ERR_USER_NOT_FOUND',
                message: 'User not found in Firestore'
        });
        }

        const userData = userDoc.data();
        res.status(200).json({
            token: customToken,
            user: {
                uid: user.uid,
                email: user.email || null,
                phone: user.phoneNumber || null,
                role: userData.role || 'user'
            }
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(400).json({
            code: 'ERR_INVALID_CREDENTIALS',
            message: error.message || 'Authentication failed'
        });
    }
};

exports.registerUser = async (req, res) => {
  const { name, phone, role } = req.body; 
  const uid = req.user.uid;
  const email = req.user.email;

  if (!["farmer", "transporter", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    // Save to Firestore
    await admin.firestore().collection("users").doc(uid).set({
      uid,
      email,
      name,
      phone,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ message: "User profile created", role });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      code: 'REGISTRATION_FAILED',
      message: error.message || 'User registration failed'
    });
  }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Implement using Firebase Client SDK in React
        // This should be handled client-side in React
        res.status(501).json({
        code: 'CLIENT_SIDE_LOGIN',
        message: 'Use Firebase client SDK for login'
        });
    } catch (error) {
        res.status(401).json({
        code: 'LOGIN_FAILED',
        message: 'Authentication failed'
        });
    }
};

exports.getUser = async (req, res) => {
    try {
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(req.user.uid)
        .get();

      if (!userDoc.exists) {
        return res.status(404).json({
          code: 'ERR_USER_NOT_FOUND',
          message: 'User not found'
        });
      }

      const userData = userDoc.data();
      res.status(200).json({
        uid: req.user.uid,
        email: req.user.email || null,
        phone: req.user.phoneNumber || null,
        role: userData.role || 'user'
     });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({
        code: 'ERR_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
};

exports.updateUser = async (req, res) => {
    // Implement user data update logic here
};

exports.deleteUser = async (req, res) => {
    // Implement user deletion logic here
};

exports.logoutUser = async (req, res) => {
    // Implement user logout logic here
};

exports.resetPassword = async (req, res) => {
    // Implement password reset logic here
};

exports.updatePassword = async (req, res) => {
    // Implement password update logic here
};
