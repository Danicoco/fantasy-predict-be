const app = require("express")();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require('firebase-admin');
const router = require("./routes");

const serviceAccount = require('./google-services.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Replace with your Firebase project configuration details
});

// Now you can use the Firebase Admin SDK


const morgan = require("morgan");
app.use(express.json({ limit: "50mb", extended: true }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(morgan("tiny"));


dotenv.config({ path: "./.env" });
const corsOptions = {
  origin: "*",
};
app.enable("trust proxy");

app.get("/", (req, res) => {
  res.send("hello to comm village api");
});

app.use("/api", router)

// runCronJob();
// fetchAndModifyFixtures();
// runPoolCronJob();
// runJob();
// runDistributeRewardsCronJob();
// runPoolSelectMatchCronJob();


module.exports = app;

