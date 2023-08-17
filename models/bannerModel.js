const mongoose = require("mongoose");

var bannerSchema = new mongoose.Schema({
  bannerName: {
    type: String,
    require: true,
  },
  description: {
    type: String,
    require: true,
  },
  photo: {
    type: String,
    require: true,
  },
  is_listed:{
    type:Boolean,
    default:true
  }
});

const Banner = new mongoose.model("Banner", bannerSchema);

module.exports = Banner;
