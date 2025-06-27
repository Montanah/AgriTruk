const express = require("express");
const cors = require("cors");

const transporterRoutes = require("./routes/transportRoutes");
const authRoutes = require("./routes/authRoutes");
const activityRoutes = require("./routes/activityLog");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();
const { swaggerUi, specs } = require("./config/swagger");
const requestMetadata = require("./middlewares/requestMetadata"); 

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestMetadata);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
app.use('/api/transporters', transporterRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/bookings", bookingRoutes);


app.get('/', (req, res)=>{
    res.status(200);
    res.send("Welcome to root URL of Server");
});

module.exports = app;
