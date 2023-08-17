//IMPORTING REQUIRED PACKAGES
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const OTPHelper = require("../helpers/OTPhelper");
const hashPasswordHelper = require("../helpers/hashPassword");
const Product = require("../models/productModel");
const {referalIdGenerator} = require("../helpers/orderIdGenerator");

//GET REGISTER PAGE
const loadRegister = async (req, res) => {
  try {
    res.render("registration");
  } catch (error) {
    console.log(error);
    res.render("error", { message: "An error occurred" });
  }
};

//SEND OTP
const sendOTP = async (req, res) => {
  try {
    let sendOtpBtnClicked = false;
    const enteredMobile = req.body.mobile;
    req.session.mobileno = req.body.mobile;
    if (!/^\d{10}$/.test(enteredMobile)) {
      return res
        .status(400)
        .json({ message: "Mobile number must be 10 digits" });
    }
    if (enteredMobile) {
      // Return success status
      sendOtpBtnClicked = true;
      req.session.sendOtpBtnClicked = sendOtpBtnClicked;
      res.status(200).json({ message: "OTP Send successfully" });
      await OTPHelper.sendOTP(req, enteredMobile); // Send the OTP to the user's mobile number
    } else {
      return res.status(400).json({ message: "Invalid Mobile number" });
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "An error occurred" });
  }
};

//VERIFY OTP PAGE
const verifyOTP = async (req, res) => {
  try {
    const enteredOTP = req.body.otp;
    let verifyBtnClicked = false;
    let otpVerified = await OTPHelper.verifingOTP(
      req.session.mobileno,
      enteredOTP
    );
    if (otpVerified) {
      // OTP verification successful, proceed with user registration
      verifyBtnClicked = true;
      req.session.verifyBtnClicked = verifyBtnClicked;
      return res.status(200).json({ message: "Verification successful" });
    } else {
      return res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "An error occurred" });
  }
};

//Verify ReferalId
const referralUsageData = {};

const verifyreferalId = async (req, res) => {
  try {
    const enteredReferalId = req.body.referalId;
    let verified = false;

    // Get the current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split('T')[0];

    // Reset usage count for the referral ID if it's a new day
    if (referralUsageData[enteredReferalId]?.lastDate !== currentDate) {
      referralUsageData[enteredReferalId] = { count: 0, lastDate: currentDate };
    }

    // Check if the referral ID has been used more than three times today
    if (referralUsageData[enteredReferalId].count >= 3) {
      return res.status(400).json({ message: "Maximum limit reached for this referral ID today" });
    }

    const oldUserReferalId = await User.findOne({ referalId: enteredReferalId });
    if (!oldUserReferalId) {
      return res.status(400).json({ message: "Invalid Referral Id" });
    }

    if (enteredReferalId == oldUserReferalId.referalId) {
      verified = true;
      req.session.verified = verified;

      // Increment the usage count for the referral ID
      referralUsageData[enteredReferalId].count += 1;

      return res.status(200).json({ message: "Verification successful" });
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "An error occurred" });
  }
};


//REGISTER USER
const insertUser = async (req, res) => {
  try {
    if (
      !req.body.name ||
      !req.body.email ||
      !req.body.mobile ||
      !req.body.password
    ) {
      return res.status(400).json({ message: "Please fill all fields" });
    }
    if (/\d/.test(req.body.name)) {
      return res
        .status(500)
        .json({ message: "Name should not contain numbers" });
    }
    if (!/^[a-zA-Z0-9._]+@gmail\.com$/.test(req.body.email)) {
      return res
        .status(500)
        .json({ message: "Email should be in proper format" });
    }
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }
    if (!/^\d{10}$/.test(req.body.mobile)) {
      return res
        .status(500)
        .json({ message: "Mobile number must be 10 digits" });
    }
    if (!req.session.sendOtpBtnClicked) {
      return res
        .status(500)
        .json({ message: "Please click send Otp and verify" });
    }
    if (!req.body.otp) {
      return res.status(500).json({ message: "Please verify OTP" });
    }
    if (!req.session.verifyBtnClicked) {
      return res.status(500).json({ message: "Please Verify Otp" });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(req.body.password)) {
      return res.status(400).json({ message: "Password should be strong." });
    }
    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const hashedPassword = await hashPasswordHelper.securePassword(
      req.body.password
    );

    const referalId = referalIdGenerator()
    // Create a new User instance
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      password: hashedPassword,
      referalId:referalId.toString()
    });

    if (req.session.verified) {
      const oldUser = await User.findOne({ referalId: req.body.referalId });
      if (oldUser) {
        oldUser.totalWallet += 100;
        oldUser.walletAdded.push(referalId.toString());

        await oldUser.save();
      } else {
        return res.status(500).json({ message: "No user found with the provided referral ID" });
      }
      // Add 100 to the new user's wallet
      user.totalWallet += 100;
      user.walletAdded.push(referalId.toString());
    }
    // Save the new user
    await user.save();
    // Store the user object in the session
    req.session.user = user;
    res.status(200).json({ message: "Registration sucessfull, Please Login" });
    req.session.verifyBtnClicked = null;
    req.session.sendOtpBtnClicked = null;
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occurred" });
  }
};

//LOAD LOGIN PAGE
const loginLoad = async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    console.log(error.message);
  }
};

//VERIFY LOGIN PAGE
const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const userData = await User.findOne({ email: email });
    if (!userData) {
      return res.status(500).json({ message: "Please Register to Continue" });
    }
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        req.session.userData = userData;
        req.session.user = {
          id: userData._id,
          name: userData.name,
        }; // Store user's name & id in session

        console.log(req.session.user);
        res.status(200).json({ message: "Login successfull" }); // Return success status
      } else {
        res.status(401).json({ message: "Email or Password are Incorrect" }); // Return error status
      }
    } else {
      res.status(401).json({ message: "Email or Password are Incorrect" }); // Return error status
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" }); // Return error status
  }
};

//GET FORTGOTPASSWORD PAGE
const loadForgotPassword = async (req, res) => {
  try {
    res.render("forgotPassword");
  } catch (error) {
    console.log(error.message);
  }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email: email });
    let sendOtpBtnClicked = false;

    if (!email) {
      return res.status(400).json({ message: "Email field cannot be empty" });
    }
    if (!user) {
      return res
        .status(404)
        .json({ message: "User with the provided email does not exist" }); // Return error status
    }
    await OTPHelper.sendOTP(req, user.mobile); // Send the OTP to the user's mobile number
    // Return success status
    sendOtpBtnClicked = true;
    req.session.sendOtpBtnClicked = sendOtpBtnClicked;
    let lastNumber = user.mobile.toString().slice(6, 10);
    res.status(200).json({
      message: `OTP sent successfully to the number ******${lastNumber}`,
    });
  } catch (error) {
    return res.status(500).json({ message: "An error occurred" });
  }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
  try {
    if (!req.body.email) {
      return res.status(400).json({ message: "Email Required" });
    }
    if (!req.session.sendOtpBtnClicked) {
      return res
        .status(500)
        .json({ message: "Please click send Otp and verify" });
    }
    if (!req.session.verifyBtnClicked) {
      return res.status(500).json({ message: "Please Verify Otp" });
    }
    if (!req.body.password || req.body.password !== req.body.confirmPassword) {
      return res
        .status(400)
        .json({ message: "Password Required and should be matched" });
    }
    const user = req.session.user;
    if (!user) {
      return res.status(400).json({ message: "OTP Not Verified" });
    }
    const userId = user._id;
    const newPassword = req.body.password;
    const passwordHash = await hashPasswordHelper.securePassword(newPassword);
    await User.findByIdAndUpdate(userId, { password: passwordHash });
    req.session.user = null; // Clear the user object from the session
    req.session.verifyBtnClicked = null;
    req.session.sendOtpBtnClicked = null;
    res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "An error occurred...." });
  }
};

//UPDATE PROFILE
const updateProfile = async (req, res) => {
  try {
    if (/\d/.test(req.body.name)) {
      return res
        .status(500)
        .json({ message: "Name should not contain numbers" });
    }
    if (!/^[a-zA-Z0-9._]+@gmail\.com$/.test(req.body.email)) {
      return res
        .status(500)
        .json({ message: "Email should be in proper format" });
    }
    if (!/^\d{10}$/.test(req.body.mobile)) {
      return res
        .status(500)
        .json({ message: "Mobile number must be 10 digits" });
    }
    const user = req.session.user; // Check if user session exists
    const usersData = await User.findOne({ _id: user.id });
    if (usersData.mobile != req.body.mobile) {
      return res
        .status(500)
        .json({ message: "Change No: please click and verify" });
    }
    if (req.session.sendOtpBtnClicked && !req.session.verifyBtnClicked) {
      return res.status(500).json({ message: "Verify OTP" });
    }
    await User.findByIdAndUpdate(user.id, {
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
    });
    req.session.verifyBtnClicked = null;
    req.session.sendOtpBtnClicked = null;
    res.status(200).json({
      message: "Profile Updated Successfully",
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "An error occurred...." });
  }
};

//UPDATE PROFILE PASSWORD

const profilePassword = async (req, res) => {
  try {
    if (!req.body.oldPassword || !req.body.newPassword) {
      return res.status(400).json({ message: "Both Fields Required" });
    }
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(req.body.oldPassword)) {
      return res
        .status(400)
        .json({ message: "Old Password should be strong." });
    }
    if (!passwordRegex.test(req.body.newPassword)) {
      return res
        .status(400)
        .json({ message: " New Password should be strong." });
    }
    const user = req.session.user; // Check if user session exists
    const usersData = await User.findOne({ _id: user.id });
    const passwordMatch = await bcrypt.compare(
      req.body.oldPassword,
      usersData.password
    );

    if (!passwordMatch) {
      return res.status(400).json({ message: "Old Password do not Match" });
    }
    const passwordHash = await hashPasswordHelper.securePassword(
      req.body.newPassword
    );
    await User.findByIdAndUpdate(user.id, { password: passwordHash });
    res.status(200).json({
      message: "Password Updated Successfully",
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "An error occurred...." });
  }
};

//LOGOUT
const userLogout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/home");
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  loadRegister,
  sendOTP,
  verifyOTP,
  insertUser,
  loginLoad,
  verifyLogin,
  verifyreferalId,
  loadForgotPassword,
  forgotPassword,
  resetPassword,
  updateProfile,
  profilePassword,
  userLogout,
};
