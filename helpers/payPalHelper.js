// paypalHelper.js
require("dotenv").config();
const paypal = require("paypal-rest-sdk");

paypal.configure({
    'mode':'sandbox',
    'client_id':process.env.PAYPAL_CLIENT_ID,
    'client_secret':process.env.PAYPAL_CLIENT_SECRET  
  })

exports.createPaypalPayment = (totalPrice, return_url, cancel_url) => {
  return new Promise((resolve, reject) => {
    const createPayment = {
      intent: "sale",
      payer: { payment_method: "paypal" },
      redirect_urls: {
        return_url: return_url,
        cancel_url: cancel_url,
      },
      transactions: [
        {
          amount: {
            currency: "USD",
            total: totalPrice.toFixed(2),
          },
          description: "Order Payment",
        },
      ],
    };

    paypal.payment.create(createPayment, (error, payment) => {
      if (error) {
        reject(error);
      } else {
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === "approval_url") {
            resolve(payment.links[i].href);
            break;
          }
        }
      }
    });
  });
};
