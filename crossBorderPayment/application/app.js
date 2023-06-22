const express = require("express");
const { exec } = require("child_process");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const uuid = require("uuid");
const app = express();
const port = 3000;
const { Gateway, Wallets } = require("fabric-network");
const {
  buildCCPOrg1,
  buildCCPOrg2,
  buildWallet,
  prettyJSONString,
} = require("./AppUtil.js");
const {
  connectToOrg1CA,
  login,
  updateProfile,
} = require("./registerEnrollUser.js");
const {
  loginBank,
  createBankWithExchangeRate,
  fetchBanks,
} = require("./Bank.js");
const { createPayment, fetchCustomerPayments } = require("./Payment.js");
const {
  createAccount,
  fetchCustomerAccounts,
  fetchBankAccounts,
  deleteAccount,
  searchCustomerbyAccount,
  updateBalance,
} = require("./Account.js");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());

app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.get("/customerHome", (req, res) => {
  res.render("customerHome", { message: null });
});
app.get("/transfer", (req, res) => {
  res.render("transfer", { errorMessage: null });
});
app.get("/deleteAccount", (req, res) => {
  res.render("deleteAccount", { errorMessage: null });
});
app.get("/updateBalance", (req, res) => {
  res.render("updateBalance");
});
app.get("/queryBank", (req, res) => {
  res.render("queryBank");
});
app.get("/signup", (req, res) => {
  res.render("createCustomer", { error: null });
});
app.get("/createCustomer", (req, res) => {
  const { error } = req.query;
  res.render("createCustomer", { error });
});
app.get("/createBank", (req, res) => {
  const { error } = req.query;
  res.render("createBank", { error });
});
app.get("/createAccount", (req, res) => {
  res.render("createAccount", { errorMessage: null });
});
app.get("/", (req, res) => {
  res.render("index");
});

// =============== MUSTERI OLUSTURMA=========== //

app.post("/signup", async (req, res) => {
  const { customerID, customerName, customerSurname, customerPassword } =
    req.body;
  if (!customerID) {
    res.status(400).json({ error: "Missing required argument: customerID" });
    return;
  }
  try {
    const hasNumber = /\d/.test(customerPassword);
    const hasChar = /[a-zA-Z]/.test(customerPassword);
    if (customerPassword.length >= 8 && hasNumber && hasChar) {
      const loginResult = await connectToOrg1CA(
        customerID,
        customerPassword,
        customerName,
        customerSurname
      );
      if (loginResult.success) {
        console.log("Müşteri oluşturma işlemi tamamlandı.");
        req.session.customerID = customerID;
        req.session.customerName = customerName;
        req.session.customerSurname = customerSurname;
        req.session.customerPassword = customerPassword;
        res.redirect("/customerHome");
      } else {
        res.redirect("/createCustomer?error=same_user");
      }
    } else {
      res.redirect("/createCustomer?error=invalid_password");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to register and enroll user." });
  }
});

// ============= MUSTERI GIRISI =============== //
app.post("/loginCustomer", async (req, res) => {
  const { customerID, customerPassword } = req.body;
  if (!customerID || !customerPassword) {
    return res.status(400).json({ error: "Missing required arguments." });
  }
  try {
    const loginResult = await login(customerID, customerPassword);
    if (loginResult.success) {
      console.log("Müşteri giriş işlemi tamamlandı.");
      req.session.customerID = customerID;
      req.session.customerPassword = customerPassword;
      res.redirect("/customerHome");
    } else {
      res.redirect("/createCustomer?error=invalid_credentials");
    }
  } catch (error) {
    console.error("Error:", error);

    res.status(500).json({ error: "Failed to login user." });
  }
});

// ============== HESAP OLUSTURMA================= //
app.post("/createAccount", async (req, res) => {
  const { customerID, bankID, balance } = req.body;
  try {
    const result = await createAccount(customerID, bankID, balance);
    if (!result.success) {
      const errorMessage = "Your ID is incorrect.";
      res.render("createAccount", { errorMessage });
    } else {
      req.session.customerID = customerID;
      res.redirect("/showAccounts");
    }
  } catch (error) {
    console.error("Error:", error);
    req.session.customerID = customerID;
    res.status(500).json({ error: "Failed to create account." });
  }
});

// ========= MUSTERI ANASAYFASI ======== //
app.get("/customerHome", (req, res) => {
  const customerID = req.session.customerID;
  const customerName = req.session.customerName;
  const customerSurname = req.session.customerSurname;
  const customerPassword = req.session.customerPassword;
  req.session.customerID = customerID;
  res.render("customerHome", {
    customerID,
    customerName,
    customerSurname,
    customerPassword,
  });
});

// ======= MUSTERI HESAPLARINI GORME ========== //
app.get("/showAccounts", async (req, res) => {
  const customerID = req.session.customerID;
  try {
    const customerAccounts = await fetchCustomerAccounts(customerID);
    req.session.customerID = customerID;
    res.render("accountList", {
      accounts: customerAccounts,
      customerID: customerID,
    });
  } catch (error) {
    console.error("Error:", error);
    req.session.customerID = customerID;
    res.status(500).json({ error: "Failed to fetch customer accounts." });
  }
});

// ========= MUSTERI PARA TRANSFERI =========== //
app.post("/transfer", async (req, res) => {
  const customerID = req.session.customerID;
  const senderAccountID = req.body.senderAccountID;
  const receiverAccountID = req.body.receiverAccountID;
  const senderCustomerID = req.body.senderCustomerID;
  const receiverCustomerID = req.body.receiverCustomerID;
  const amount = req.body.amount;
  const password = req.body.password;
  const date = new Date().toISOString();

  try {
    const loginResult = await login(senderCustomerID, password);
    if (loginResult.success) {
      const result = await createPayment(
        senderAccountID,
        receiverAccountID,
        senderCustomerID,
        receiverCustomerID,
        amount,
        date
      );
      req.session.customerID = customerID;
      if (result.success) {
        const message = "The transfer made successfully.";
        res.render("customerHome", { message });
      } else {
        const errorMessage = "Receiver ID is incorrect.";
        res.render("transfer", { errorMessage });
      }
    } else {
      const errorMessage = "Your password is incorrect.";
      res.render("transfer", { errorMessage });
      return;
    }
  } catch {
    res.status(500).json({ error: "Failed." });
  }
});

app.get("/transfer/:accountID", async (req, res) => {
  const customerID = req.session.customerID;
  const accountID = req.params.accountID;
  try {
    const customerPayments = await fetchCustomerPayments(customerID, accountID);
    req.session.customerID = customerID;
    res.render("paymentList", { payments: customerPayments });
  } catch (error) {
    console.error("Error:", error);
    req.session.customerID = customerID;
    res.status(500).json({ error: "Failed to fetch customer payments." });
  }
});

app.post("/deleteAccount", async (req, res) => {
  const accountID = req.body.accountID;
  const customerID = req.session.customerID;
  const confirmation = req.body.confirmation;
  try {
    if (confirmation !== "YES") {
      const errorMessage =
        "You must enter the correct confirmation word to delete the account.";
      res.render("deleteAccount", { errorMessage });
      return;
    }
    const result = await deleteAccount(customerID, accountID);
    let message = "";
    if (result.success) {
      req.session.customerID = customerID;
      message = "Your account has been successfully deleted.";
    } else {
      req.session.customerID = customerID;
      message = "Delete Process failed.";
    }
    res.render("customerHome", { message });
  } catch (error) {
    console.error("Error:", error);
    req.session.customerID = customerID;
    res.status(500).json({ error: "Failed to fetch customer payments." });
  }
});

app.post("/updateBalance", async (req, res) => {
  const customerID = req.session.customerID;
  const accountID = req.body.accountID;
  const amount = req.body.amount;

  try {
    await updateBalance(customerID, accountID, amount);
    req.session.customerID = customerID;

    const message = "Account balance updated.";
    res.render("customerHome", { message });
  } catch (error) {
    console.error("Error:", error);
    req.session.customerID = customerID;
    res.status(500).json({ error: "Account balance update failed." });
  }
});

app.get("/editCustomerProfile", async (req, res) => {
  const customerID = req.session.customerID;
  try {
    const customerDetails = await searchCustomerbyAccount(customerID);
    const customerName = customerDetails.name;
    const customerSurname = customerDetails.surname;
    const customerPassword = customerDetails.password;
    req.session.customerID = customerID;
    res.render("editCustomerProfile", {
      customerID,
      customerName,
      customerSurname,
      customerPassword,
    });
  } catch (error) {
    console.error("Error:", error);
    req.session.customerID = customerID;
    res.status(500).json({ error: "Failed to fetch customer details." });
  }
});

app.post("/editCustomerProfile", async (req, res) => {
  const customerID = req.session.customerID;
  const { customerName, customerSurname, customerPassword } = req.body;

  try {
    await updateProfile(
      customerID,
      customerName,
      customerSurname,
      customerPassword
    );
    const message = "Your profile has been updated.";
    req.session.customerID = customerID;
    res.render("customerHome", { message });
  } catch (error) {
    console.error("Error:", error);
    req.session.customerID = customerID;
    res.status(500).json({ error: "Failed to update customer profile." });
  }
});

// ======================= BANKA OLUSTURMA================================== //
app.post("/createBank", async (req, res) => {
  const { bankadminID, bankID, name, password, country, currency, reserves } =
    req.body;
  if (!bankadminID || !bankID) {
    return res.status(400).json({ error: "Missing required arguments." });
  }

  try {
    const isSuccess = await createBankWithExchangeRate(
      bankID,
      bankadminID,
      name,
      password,
      country,
      currency,
      reserves
    );
    if (isSuccess) {
      console.log("Banka oluşturma işlemi tamamlandı.");
      req.session.bankID = bankID;
      req.session.bankadminID = bankadminID;
      req.session.name = name;
      req.session.password = password;
      req.session.country = country;
      req.session.reserves = reserves;
      req.session.currency = currency;
      res.redirect("/bankHome");
    } else {
      res.redirect("/createBank?error=invalid_user");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to create bank." });
  }
});

// ======================= BANKA GIRISI================================== //
app.post("/loginBank", async (req, res) => {
  const { bankadminID, bankID, password } = req.body;
  try {
    const result = await loginBank(bankadminID, bankID, password);
    if (result.success) {
      req.session.bankID = bankID;
      req.session.bankadminID = bankadminID;
      req.session.password = password;
      res.redirect("/bankHome");
    } else {
      res.redirect("/createBank?error=invalid_credentials");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to login bank." });
  }
});

// ========== BANKA ANASAYFASI========== //
app.get("/bankHome", (req, res) => {
  const bankID = req.session.bankID;
  const bankadminID = req.session.bankadminID;
  const name = req.session.name;
  const password = req.session.password;
  const country = req.session.country;
  const reserves = req.session.reserves;
  const currency = req.session.currency;
  res.render("bankHome", {
    bankID,
    bankadminID,
    name,
    password,
    country,
    reserves,
    currency,
  });
});

app.get("/showBank", async (req, res) => {
  const bankID = req.session.bankID;
  const bankadminID = req.session.bankadminID;
  try {
    const bank = await fetchBanks(bankID, bankadminID);
    req.session.bankadminID = bankadminID;
    req.session.bankID = bankID;
    res.render("showBank", { bank: bank });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to fetch bank accounts." });
  }
});

// ============== BANKA HEAPLARI GORME==================== //
app.get("/showAccountsforBank", async (req, res) => {
  const bankID = req.session.bankID;
  const bankadminID = req.session.bankadminID;
  try {
    const bankAccounts = await fetchBankAccounts(bankID, bankadminID);
    req.session.bankadminID = bankadminID;
    req.session.bankID = bankID;
    res.render("bankAccountList", {
      accounts: bankAccounts,
      bankadminID: bankadminID,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to fetch bank accounts." });
  }
});

app.get("/transferForBank/:accountID", async (req, res) => {
  const bankadminID = req.session.bankadminID;
  const accountID = req.params.accountID;
  const bankID = req.session.bankID;
  try {
    const customerPayments = await fetchCustomerPayments(
      bankadminID,
      accountID
    );
    req.session.bankadminID = bankadminID;
    req.session.bankID = bankID;
    res.render("paymentListforBank", { payments: customerPayments });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to fetch customer payments." });
  }
});

app.get("/customerDetails/:customerID", async (req, res) => {
  const customerID = req.params.customerID;
  const bankadminID = req.session.bankadminID;
  const bankID = req.session.bankID;
  try {
    const customerDetails = await searchCustomerbyAccount(customerID);
    req.session.bankadminID = bankadminID;
    req.session.bankID = bankID;
    res.render("customerDetails", { customer: customerDetails });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to fetch customer details." });
  }
});

app.get("/k6-test", (req, res) => {
  res.send("K6 testi başarıyla tamamlandı");
});

app.listen(port, () => {
  console.log(`Uygulama ${port} portunda çalışıyor.`);
});
