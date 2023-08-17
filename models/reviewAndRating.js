const mongoose = require("mongoose");

const reviewAndRatingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
  },
  review: {
    type: String,
  },
  dateAdded: {
    type: String,
    required: true,
  },
  isReported: {
    type: Boolean,
    default: false,
  },
  isEdited: {
    type: Boolean,                           
    default: false,
  },
  reportedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const Review = mongoose.model("Review", reviewAndRatingSchema);

module.exports = Review;
