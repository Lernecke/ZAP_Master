const { validateData } = require('swissqrbill/lib/cjs/shared/validator.cjs');

try {
  validateData({
    amount: 100,
    currency: "CHF",
    creditor: {
      account: "CH3509000000000000001",
      name: "ZAP",
      address: "Test",
      zip: "1234",
      city: "Zurich",
      country: "CH"
    },
    debtor: {
      name: "John Doe",
      address: "Bitte ergänzen",
      zip: "0000",
      city: "Bitte ergänzen",
      country: "CH"
    }
  });
  console.log("Valid");
} catch(e) {
  console.log("Error:", e.message);
}
