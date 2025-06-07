const express = require("express");
const cors = require("cors");

const transportRoutes = require("./routes/transportRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// app.use("/api/transport", transportRoutes);
app.get('/', (req, res)=>{
    res.status(200);
    res.send("Welcome to root URL of Server");
});

module.exports = app;
