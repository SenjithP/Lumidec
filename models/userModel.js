const mongoose = require("mongoose");
const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  }, 
  mobile: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  is_blocked:{
    type:Number,
    required:true,
    default:false
},
totalWallet: {
  type: Number,
  default: 0
},     
wallet:{
  type:[Number]
},
coupons:{
  type:[String]
},
referalId:{
  type:String
},
walletAdded:{
  type:[String]
},
createdAt: {
    type: Date,
    default: Date.now,
  },
address:[{
  name:String,
  mobile:Number,
  pincode:Number,
  address:String,
  city:String,
  state:String,
  addressType:String
}]
});

module.exports = mongoose.model("User", userSchema); 
