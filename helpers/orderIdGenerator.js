const voucher_codes = require("voucher-code-generator");

function OrderIdGenHelper() {
  return voucher_codes.generate({
    prefix: "#",
    length: 10,
    charset: voucher_codes.charset("alphanumeric"),
  });
}

function referalIdGenerator() {
  return voucher_codes.generate({
    prefix: "LUMI",
    length: 5,
    charset: voucher_codes.charset("alphanumeric"),
  });
}


module.exports = {OrderIdGenHelper,referalIdGenerator};
 