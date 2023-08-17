const express = require("express");
const errorRoute = express();

// Set the view engine and views directory
errorRoute.set("view engine", "ejs");
errorRoute.set("views", "./views"); // Make sure the path is correct based on your project structure

errorRoute.use(function (req, res, next) {
  res.status(404);
  if (req.xhr) {
    res.json({ error: "Not found" });
  } else {
    res.render("404Pages"); // Assuming "404Pages" is your EJS template file
  }
});

module.exports = errorRoute;
