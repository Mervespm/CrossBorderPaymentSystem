"use strict";

const { Gateway, Wallets } = require("fabric-network");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const {
  buildCCPOrg1,
  buildCCPOrg2,
  buildWallet,
  prettyJSONString,
} = require("./AppUtil.js");

const myChannel = "bankschannel";
const myChaincodeName = "bank";

function generateAccountID() {
  return uuidv4();
}

async function createAccount(customerID, bankID, balance) {
  try {
    const ccp = buildCCPOrg1();
    const walletPath = path.join(__dirname, "wallet/org1");
    const wallet = await buildWallet(Wallets, walletPath);
    const accountID = generateAccountID();
    const gateway = new Gateway();

    const identityExists = await wallet.get(customerID);
    if (!identityExists) {
      throw new Error(`Customer ID ${customerID} not found in the wallet.`);
    }

    await gateway.connect(ccp, {
      wallet: wallet,
      identity: customerID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    let statefulTxn = contract.createTransaction("CreateAccount");

    console.log("\n--> Submit Transaction: Propose a new account");
    await statefulTxn.submit(accountID, customerID, bankID, balance);
    console.log("* Result: committed");

    console.log("\n--> Evaluate Transaction: query the customer accounts");
    let result = await contract.evaluateTransaction("QueryAccount", accountID);
    console.log(
      "* Result: Customer Accounts: " + prettyJSONString(result.toString())
    );

    gateway.disconnect();
    return { success: true };
  } catch (error) {
    console.error(`**** FAILED to submit account: ${error}`);
    return { success: false, error: error.message };
  }
}

async function deleteAccount(customerID, accountID) {
  try {
    const ccp = buildCCPOrg1();
    const walletPath = path.join(__dirname, "wallet/org1");
    const wallet = await buildWallet(Wallets, walletPath);
    const gateway = new Gateway();

    const identityExists = await wallet.get(customerID);
    if (!identityExists) {
      throw new Error(`Customer ID ${customerID} not found in the wallet.`);
    }
    await gateway.connect(ccp, {
      wallet: wallet,
      identity: customerID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    let statefulTxn = contract.createTransaction("DeleteAccount");

    console.log("\n--> Submit Transaction: Propose a new bank");
    await statefulTxn.submit(accountID);
    console.log("* Result: committed");
    gateway.disconnect();
    return { success: true };
  } catch (error) {
    console.error(`**** FAILED to submit delete account: ${error}`);
    return { success: false, error: error.message };
  }
}

async function searchCustomerbyAccount(customerID) {
  try {
    const ccp = buildCCPOrg1();
    const walletPath = path.join(__dirname, "wallet/org1");
    const wallet = await buildWallet(Wallets, walletPath);

    const gateway = new Gateway();

    await gateway.connect(ccp, {
      wallet: wallet,
      identity: customerID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    console.log("\n--> Evaluate Transaction: query the customer accounts");
    let result = await contract.evaluateTransaction(
      "QueryCustomer",
      customerID
    );
    console.log(
      "* Result: Customer Accounts: " + prettyJSONString(result.toString())
    );

    gateway.disconnect();

    // Parse the result and return the customer accounts as an array or object
    const customer = JSON.parse(result.toString());
    return customer;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to fetch customer accounts");
  }
}

async function fetchCustomerAccounts(customerID) {
  try {
    const ccp = buildCCPOrg1();
    const walletPath = path.join(__dirname, "wallet/org1");
    const wallet = await buildWallet(Wallets, walletPath);

    const gateway = new Gateway();

    // Connect using Discovery enabled
    await gateway.connect(ccp, {
      wallet: wallet,
      identity: customerID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    console.log("\n--> Evaluate Transaction: query the customer accounts");
    let result = await contract.evaluateTransaction(
      "QueryCustomerAccounts",
      customerID
    );
    console.log(
      "* Result: Customer Accounts: " + prettyJSONString(result.toString())
    );

    gateway.disconnect();

    // Parse the result and return the customer accounts as an array or object
    const customerAccounts = JSON.parse(result.toString());
    return customerAccounts;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to fetch customer accounts");
  }
}

async function fetchBankAccounts(bankID, bankadminID) {
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
    let result = await contract.evaluateTransaction(
      "QueryBankAccounts",
      bankID
    );
    console.log(
      "* Result: Bank Accounts: " + prettyJSONString(result.toString())
    );

    gateway.disconnect();

    const customerAccounts = JSON.parse(result.toString());
    return customerAccounts;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to fetch bank accounts");
  }
}

async function fetchBankCustomers(bankID, bankadminID) {
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

    console.log("\n--> Evaluate Transaction: query the bank customer");
    let result = await contract.evaluateTransaction(
      "QueryCustomersByBank",
      bankID
    );
    console.log("* Result: Customers: " + prettyJSONString(result.toString()));

    gateway.disconnect();

    const customers = JSON.parse(result.toString());
    return customers;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to fetch bank accounts");
  }
}

async function updateBalance(customerID, accountID, amount) {
  try {
    const ccp = buildCCPOrg1();
    const walletPath = path.join(__dirname, "wallet/org1");
    const wallet = await buildWallet(Wallets, walletPath);

    const gateway = new Gateway();

    await gateway.connect(ccp, {
      wallet: wallet,
      identity: customerID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    let statefulTxn = contract.createTransaction("UpdateBalance");

    console.log("\n--> Submit Transaction: Propose a new bank");
    await statefulTxn.submit(accountID, amount);
    console.log("* Result: committed");
    gateway.disconnect();
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to fetch customer accounts");
  }
}

module.exports = {
  createAccount,
  fetchCustomerAccounts,
  fetchBankAccounts,
  fetchBankCustomers,
  deleteAccount,
  searchCustomerbyAccount,
  updateBalance,
};
