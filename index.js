require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const port = process.env.PORT || 5000;
const userRoute = require("./routes/userRoute");
const adminRoute = require("./routes/adminRoute");
const errorRoute = require("./routes/errorRoute");
const paypal = require("paypal-rest-sdk");




app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files from the "public" directory


app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname+'/public/user'));
app.use(express.static(__dirname+'/public/admin'));

paypal.configure({
  'mode':'sandbox',
  'client_id':process.env.PAYPAL_CLIENT_ID,
  'client_secret':process.env.PAYPAL_CLIENT_SECRET  
})


app.use("/", userRoute);

app.use("/admin", adminRoute);

app.use(errorRoute);

mongoose
  .connect(process.env.DB)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(port, () => {
      console.log(`Server started at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB:", error.message);
  });
