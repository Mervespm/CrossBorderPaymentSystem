"use strict";

const { Gateway, Wallets } = require("fabric-network");
const path = require("path");
const https = require("https");
const fs = require("fs");
const {
  buildCCPOrg1,
  buildCCPOrg2,
  buildWallet,
  prettyJSONString,
} = require("./AppUtil.js");

const myChannel = "bankschannel";
const myChaincodeName = "bank";

async function createBank(
  bankID,
  bankadminID,
  name,
  password,
  country,
  currency,
  reserves
) {
  try {
    const certFile = "/path/to/certificate.pem";
    const agent = new https.Agent({
      ca: fs.readFileSync(certFile),
    });

    const ccp = buildCCPOrg1();
    const walletPath = path.join(__dirname, "wallet/org1");
    const wallet = await buildWallet(Wallets, walletPath);

    const gateway = new Gateway();

    await gateway.connect(ccp, {
      wallet: wallet,
      identity: bankadminID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    let statefulTxn = contract.createTransaction("CreateBank");

    console.log("\n--> Submit Transaction: Propose a new bank");
    await statefulTxn.submit(
      bankID,
      bankadminID,
      name,
      password,
      country,
      currency,
      reserves
    );
    console.log("* Result: committed");

    console.log(
      "\n--> Evaluate Transaction: query the bank that was just created"
    );
    let result = await contract.evaluateTransaction("QueryBank", bankID);
    console.log("* Result: Bank: " + prettyJSONString(result.toString()));

    gateway.disconnect();

    return true; // İşlem başarılıysa true döndür
  } catch (error) {
    console.error(`**** FAILED to submit bank: ${error}`);
    return false; // İşlem başarısızsa false döndür
  }
}

async function createBank(
  bankID,
  bankadminID,
  name,
  password,
  country,
  currency,
  reserves
) {
  try {
    const certFile = "/path/to/certificate.pem";
    const agent = new https.Agent({
      ca: fs.readFileSync(certFile),
    });

    const ccp = buildCCPOrg1();
    const walletPath = path.join(__dirname, "wallet/org1");
    const wallet = await buildWallet(Wallets, walletPath);

    const gateway = new Gateway();

    // Connect using Discovery enabled
    await gateway.connect(ccp, {
      wallet: wallet,
      identity: bankadminID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    let statefulTxn = contract.createTransaction("CreateBank");

    console.log("\n--> Submit Transaction: Propose a new bank");
    await statefulTxn.submit(
      bankID,
      bankadminID,
      name,
      password,
      country,
      currency,
      reserves,
      1
    );
    console.log("* Result: committed");

    console.log(
      "\n--> Evaluate Transaction: query the bank that was just created"
    );
    let result = await contract.evaluateTransaction("QueryBank", bankID);
    console.log("* Result: Bank: " + prettyJSONString(result.toString()));

    gateway.disconnect();

    return true;
  } catch (error) {
    console.error(`**** FAILED to submit bank: ${error}`);
    return false;
  }
}

async function getExchangeRate(fromCurrency, toCurrency) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "v6.exchangerate-api.com",
      port: 443,
      path: `/v6/be244c9bfe20c9c36234c05b/latest/${fromCurrency}`,
      method: "GET",
    };

    const req = https.get(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        const response = JSON.parse(data);
        const rate = response.conversion_rates[toCurrency];
        resolve(rate);
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

async function createBankWithExchangeRate(
  bankID,
  bankadminID,
  name,
  password,
  country,
  currency,
  reserves
) {
  try {
    const exchangeRate = await getExchangeRate("USD", currency);
    const bank = {
      Name: name,
      BankID: bankID,
      BankAdminID: bankadminID,
      Country: country,
      Currency: currency,
      Reserves: reserves,
      Password: password,
      AccountIDs: [],
      ExchangeRate: exchangeRate,
    };

    const ccp = buildCCPOrg1();
    const walletPath = path.join(__dirname, "wallet/org1");
    const wallet = await buildWallet(Wallets, walletPath);

    const gateway = new Gateway();

    await gateway.connect(ccp, {
      wallet: wallet,
      identity: bankadminID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    let statefulTxn = contract.createTransaction("CreateBank");

    console.log("\n--> Submit Transaction: Propose a new bank");
    await statefulTxn.submit(
      bankID,
      bankadminID,
      name,
      password,
      country,
      currency,
      reserves,
      exchangeRate
    );
    console.log("* Result: committed");

    console.log(
      "\n--> Evaluate Transaction: query the bank that was just created"
    );
    let result = await contract.evaluateTransaction("QueryBank", bankID);
    console.log("* Result: Bank: " + prettyJSONString(result.toString()));

    gateway.disconnect();

    return true; // İşlem başarılıysa true döndür
  } catch (error) {
    console.error("**** FAILED to submit bank:", error);
    return false; // İşlem başarısızsa false döndür
  }
}

async function loginBank(bankadminID, bankID, password) {
  try {
    const ccp = buildCCPOrg1();
    const walletPath = path.join(__dirname, "wallet/org1");
    const wallet = await buildWallet(Wallets, walletPath);

    const gateway = new Gateway();

    await gateway.connect(ccp, {
      wallet: wallet,
      identity: bankadminID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);
    const userPassword = await getPasswordFromBlockchain(bankadminID);

    if (password === userPassword) {
      console.log("Şifre doğrulandı");
      console.log(
        "\n--> Evaluate Transaction: query the bank that was just created"
      );
      let result = await contract.evaluateTransaction("QueryBank", bankID);
      console.log("* Result: Bank: " + prettyJSONString(result.toString()));
      return { success: true };
    } else {
      throw new Error("Şifre yanlış");
    }
  } catch (error) {
    console.error(`Şifre doğrulama hatası: ${error}`);
    return { success: false, error: error.message };
  }
}

async function getPasswordFromBlockchain(UserID) {
  try {
    const gateway = new Gateway();
    const walletPathOrg1 = path.join(__dirname, "wallet/org1");
    const walletOrg1 = await buildWallet(Wallets, walletPathOrg1);

    const ccpOrg1 = buildCCPOrg1();
    await gateway.connect(ccpOrg1, {
      wallet: walletOrg1,
      identity: UserID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    console.log("\n--> Evaluate Transaction: QueryCustomerPassword");
    const result = await contract.evaluateTransaction(
      "QueryCustomerPassword",
      UserID
    );
    const password = result.toString();

    gateway.disconnect();
    return password;
  } catch (error) {
    console.error(`Failed to get password from the blockchain: ${error}`);
    throw error;
  }
}
async function updateBankProfile(bankID, bankadminID, name, reserves, country) {
  try {
    const ccpOrg1 = buildCCPOrg1();
    const walletPathOrg1 = path.join(__dirname, "wallet/org1");
    const walletOrg1 = await buildWallet(Wallets, walletPathOrg1);

    const gateway = new Gateway();
    await gateway.connect(ccpOrg1, {
      wallet: walletOrg1,
      identity: bankadminID,
      discovery: { enabled: true, asLocalhost: true },
    });
    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    let statefulTxn = contract.createTransaction("UpdateBankProfile");

    console.log("\n--> Submit Transaction: Update customer profile");
    await statefulTxn.submit(bankID, bankadminID, name, reserves, country);
    console.log("* Result: committed");

    gateway.disconnect();
    return { success: true };
  } catch (error) {
    console.error(`**** FAILED to update profile: ${error}`);
    return { success: false, error: error.message };
  }
}

async function fetchBanks(bankID, bankadminID) {
  try {
    const ccp = buildCCPOrg1();
    const walletPath = path.join(__dirname, "wallet/org1");
    const wallet = await buildWallet(Wallets, walletPath);

    const gateway = new Gateway();

    await gateway.connect(ccp, {
      wallet: wallet,
      identity: bankadminID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    console.log("\n--> Evaluate Transaction: query the customer accounts");
    let result = await contract.evaluateTransaction("QueryBank", bankID);
    console.log("* Result: Banks: " + prettyJSONString(result.toString()));

    gateway.disconnect();

    const bankAccounts = JSON.parse(result.toString());
    return bankAccounts;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to fetch bank accounts");
  }
}

async function searchCustomer(bankadminID, customerID) {
  try {
    const ccp = buildCCPOrg1();
    const walletPath = path.join(__dirname, "wallet/org1");
    const wallet = await buildWallet(Wallets, walletPath);

    const gateway = new Gateway();

    await gateway.connect(ccp, {
      wallet: wallet,
      identity: bankadminID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    console.log("\n--> Evaluate Transaction: query the customer");
    let result = await contract.evaluateTransaction(
      "QueryCustomer",
      customerID
    );
    console.log("* Result: Customer: " + prettyJSONString(result.toString()));

    const customer = JSON.parse(result.toString());
    return customer;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to fetch bank accounts");
  }
}

async function updateReserve(bankadminID, bankID, reserves) {
  try {
    const ccp = buildCCPOrg1();
    const walletPath = path.join(__dirname, "wallet/org1");
    const wallet = await buildWallet(Wallets, walletPath);

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet: wallet,
      identity: bankadminID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    const userPassword = await getPasswordFromBlockchain(bankadminID);

    if (password === userPassword) {
      console.log("Şifre doğrulandı");
      console.log(
        "\n--> Evaluate Transaction: query the bank that was just created"
      );
      let statefulTxn = contract.createTransaction("UpdateReserve");
      console.log("\n--> Submit Transaction: Propose a new bank");
      await statefulTxn.submit(bankadminID, bankID, reserves);
      console.log("* Result: committed");
      gateway.disconnect();
      return { success: true };
    } else {
      throw new Error("Şifre yanlış");
    }
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to fetch customer accounts");
  }
}

module.exports = {
  createBank,
  loginBank,
  createBankWithExchangeRate,
  updateBankProfile,
  fetchBanks,
  updateReserve,
};
