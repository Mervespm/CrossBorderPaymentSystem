/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

const { Wallets, Gateway } = require("fabric-network");
const FabricCAServices = require("fabric-ca-client");
const path = require("path");
const { buildCAClient, registerAndEnrollUser } = require("./CAUtil.js");
const {
  buildCCPOrg1,
  buildCCPOrg2,
  buildWallet,
  prettyJSONString,
} = require("./AppUtil.js");
const { argv } = require("process");

const mspOrg1 = "Org1MSP";
const mspOrg2 = "Org2MSP";

const myChannel = "bankschannel";
const myChaincodeName = "bank";

async function connectToOrg1CA(UserID, password, name, surname) {
  console.log("\n--> Register and enrolling new user");
  const ccpOrg1 = buildCCPOrg1();
  const caOrg1Client = buildCAClient(
    FabricCAServices,
    ccpOrg1,
    "ca.org1.example.com"
  );

  const walletPathOrg1 = path.join(__dirname, "wallet/org1");
  const walletOrg1 = await buildWallet(Wallets, walletPathOrg1);
  try {
    const enrollmentResult = await registerAndEnrollUser(
      caOrg1Client,
      walletOrg1,
      mspOrg1,
      UserID,
      "org1.department1"
    );
    if (enrollmentResult.success) {
      await SetCustomer(ccpOrg1, walletOrg1, UserID, password, name, surname);
      return { success: true, enrollment: enrollmentResult.enrollment };
    } else {
      return { success: false, error: "Failed to register and enroll user." };
    }
  } catch (error) {
    console.error(`Ayni kullanicidan bulunmakta: ${error}`);
    return { success: false, error: error.message };
  }
}

async function SetCustomer(ccp, wallet, UserID, password, name, surname) {
  try {
    const gateway = new Gateway();

    await gateway.connect(ccp, {
      wallet: wallet,
      identity: UserID,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    let statefulTxn = contract.createTransaction("CreateCustomer");

    console.log("\n--> Submit Transaction: Propose a new user");
    await statefulTxn.submit(UserID, password, name, surname);
    console.log("* Result: committed");

    console.log(
      "\n--> Evaluate Transaction: query the user that was just created"
    );
    let result = await contract.evaluateTransaction("QueryCustomer", UserID);
    console.log("* Result: User: " + prettyJSONString(result.toString()));
    gateway.disconnect();
    return { success: true };
  } catch (error) {
    console.error(`**** FAILED to show user: ${error}`);
    return { success: false, error: error.message };
  }
}

async function login(UserID, password) {
  try {
    const userPassword = await getPasswordFromBlockchain(UserID);

    if (password === userPassword) {
      console.log("Şifre doğrulandı");
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

async function updateProfile(customerID, name, surname, password) {
  try {
    const ccpOrg1 = buildCCPOrg1();
    const walletPathOrg1 = path.join(__dirname, "wallet/org1");
    const walletOrg1 = await buildWallet(Wallets, walletPathOrg1);

    const gateway = new Gateway();
    await gateway.connect(ccpOrg1, {
      wallet: walletOrg1,
      identity: customerID,
      discovery: { enabled: true, asLocalhost: true },
    });
    const network = await gateway.getNetwork(myChannel);
    const contract = network.getContract(myChaincodeName);

    let statefulTxn = contract.createTransaction("UpdateProfile");

    console.log("\n--> Submit Transaction: Update customer profile");
    await statefulTxn.submit(customerID, name, surname, password);
    console.log("* Result: committed");

    gateway.disconnect();
    return { success: true };
  } catch (error) {
    console.error(`**** FAILED to update profile: ${error}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  connectToOrg1CA,
  login,
  updateProfile,
};
