const nodemailer = require("nodemailer");
const User = require("../models/userModel");
const Order = require("../models/orderModel");

const sendEmail = async (req,subject, message) => {
  try {
    const userId = req.session.userData?._id;
    const userDatas = await User.findOne({ _id: userId });

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: userDatas.email,
      subject: subject,
      text: message,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const MessageContent = async (req, res) => {
  try {
    const userId = req.session.userData?._id;
    const userDatas = await User.findOne({ _id: userId });
    const orderData = await Order.find({ user: userId }).populate(
      "items.product"
    );

    const lastOrder = orderData[orderData.length - 1];
    if (lastOrder) {
      const items = lastOrder.items;
      const productNames = [];
      const productQuantity = [];
      for (const item of items) {
        const product = item.product;
        const quantity = item.quantity;
        productNames.push(product.name);
        productQuantity.push(quantity);
        var productNamesToSend = productNames
          .map((name) => `• ${name}`)
          .join("\n");
        var productQuantityToSend =
          productQuantity.join(", ") + " respectively";
      }
    }

    let orderIdToSend = [];
    orderIdToSend = orderData.map(item => item.Order_ID); // Assign the mapped array directly to res
    const lastOrderIdToSend = orderIdToSend[orderIdToSend.length - 1];

    let addressToSend = [];
    addressToSend = orderData.map(item => item.address); // Assign the mapped array directly to res
    const lastAddedAddress = addressToSend[addressToSend.length - 1];
    const { _id, ...rest } = lastAddedAddress;

    const lastaddressToSend = Object.entries(rest).map(([key, value]) => `- ${key}: ${value}`).join('\n')

    const currentDate = new Date();
    const estimatedDeliveryDate = new Date(
      currentDate.getTime() + 5 * 24 * 60 * 60 * 1000
    );
    const day = estimatedDeliveryDate.getDate().toString().padStart(2, "0");
    const month = (estimatedDeliveryDate.getMonth() + 1)
      .toString()
      .padStart(2, "0");
    const year = estimatedDeliveryDate.getFullYear();
    const formattedEstimatedDeliveryDate = `${day}-${month}-${year}`;

    const subject = "Order Confirmation - Your Successful Purchase!";
    const message = `

Dear ${lastAddedAddress.name},

Congratulations! Your order has been successfully processed and is now confirmed. We are thrilled to inform you that your chosen product is on its way to being delivered to your doorstep.

Order Details:
Order ID: ${lastOrderIdToSend}

Product Details:
Product Name(s): ${productNamesToSend}

Quantity Details:
Quantity: ${productQuantityToSend}

Price Details:
Total Amount: ₹${lastOrder.total+lastOrder.shipping_charge} /-

Payment Method: ${lastOrder.payment_method}

Shipping Address:
${lastaddressToSend}

Estimated Delivery Time:
${formattedEstimatedDeliveryDate}

Your order will be delivered by our trusted shipping partner and should arrive within the estimated delivery time mentioned above. Please make sure someone is available to receive the package at the provided address during the delivery hours.

We hope you enjoy your purchase, and if you have any questions or need assistance, feel free to reach out to our customer support team at +91-9854717456 or lumidec.ac@gmail.com. We're here to help!

Thank you for choosing LUMIDEC. We truly value your business and look forward to serving you again in the future.

Best regards,
LUMIDEC Customer Support Team
lumidec.ac@gmail.com /  +91-9854717456
`;

    sendEmail(req,subject, message);
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  sendEmail,
  MessageContent,
};
