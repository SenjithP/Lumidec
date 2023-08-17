const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID; 
const client = require("twilio")(accountSid, authToken);


const sendOTP = async (req, mobile) => {
  try {
    const verification = await client.verify.services(verifySid)
      .verifications.create({ to: `+91${mobile}`, channel: "sms" });
    console.log("OTP verification status:", verification.status);
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

const verifingOTP = async (mobile, otp) => {
  try {
    // Assuming `verifySid` is defined elsewhere in your code
    const verificationCheck = await client.verify.v2.services(verifySid)
      .verificationChecks.create({ to: `+91${mobile}`, code: otp });            
    console.log("OTP verification check status:", verificationCheck.status);

    // Check if the OTP is valid
    if (verificationCheck.status === "approved") {
      console.log("OTP is valid.");
      return true;
    } else {
      console.log("Invalid OTP.");
      return false;
    }
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};



module.exports = { sendOTP,verifingOTP };
