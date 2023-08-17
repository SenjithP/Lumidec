const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  Order_ID:{
    type:String
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
  discount:{
    type:Number
  },
  reason:{
    type:String
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ["Pending", "Processing", "Returned", "Refunded" , "Shipped", "Delivered","cancelled"],
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  payment_method: {
    type: String,
    required: false,
  },
  shipping_charge: { 
    type: Number,
    required: true,
  },
  address: {
    type: Object,
    required: true,
   
  },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;