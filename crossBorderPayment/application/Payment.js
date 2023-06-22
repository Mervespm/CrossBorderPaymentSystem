/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const https = require('https');
const fs = require('fs');
const uuid = require('uuid');
const { buildCCPOrg1, buildCCPOrg2, buildWallet, prettyJSONString} = require('./AppUtil.js');

const myChannel = 'bankschannel';
const myChaincodeName = 'bank';

async function fetchCustomerPayments(customerID,accountID) {
	try {
		const ccp = buildCCPOrg1();
		const walletPath = path.join(__dirname, 'wallet/org1');
		const wallet = await buildWallet(Wallets, walletPath);

		const gateway = new Gateway();

		// Connect using Discovery enabled
		await gateway.connect(ccp,
			{ wallet: wallet, identity: customerID, discovery: { enabled: true, asLocalhost: true } });
  
	  const network = await gateway.getNetwork(myChannel);
	  const contract = network.getContract(myChaincodeName);
  
	  console.log('\n--> Evaluate Transaction: query the customer Payments');
	  let result = await contract.evaluateTransaction('QueryPayments', accountID);
	  console.log('* Result: Customer Payments: ' + prettyJSONString(result.toString()));

	  gateway.disconnect();
  
	  // Parse the result and return the customer accounts as an array or object
	  const customerPayments =  JSON.parse(result.toString());
	  return customerPayments;
	} catch (error) {
	  console.error('Error:', error);
	  throw new Error('Failed to fetch customer Payments');
	}
}



async function createPayment(senderAccountID, receiverAccountID, senderCustomerID, receiverCustomerID, amount, date) {
	try {

		const paymentID = generatePaymentID();
		const ccp = buildCCPOrg1();
		const walletPath = path.join(__dirname, 'wallet/org1');
		const wallet = await buildWallet(Wallets, walletPath);
		const gateway = new Gateway();

		const identityExists = await wallet.get(senderCustomerID);
		const identityExists1 = await wallet.get(receiverCustomerID);
		if (!identityExists) {
			throw new Error(`Customer ID ${senderCustomerID} not found in the system.`);
		}
		if (!identityExists1) {
			throw new Error(`Customer ID ${receiverCustomerID} not found in the system.`);
		}else{
			// Connect using Discovery enabled
			await gateway.connect(ccp,
				{ wallet: wallet, identity: senderCustomerID, discovery: { enabled: true, asLocalhost: true } });

			let network = await gateway.getNetwork(myChannel);
			let contract = network.getContract(myChaincodeName);
		// Get accountSender information
		const accountSenderBytes = await contract.evaluateTransaction('GetAccount', senderAccountID);
		const accountSender = JSON.parse(accountSenderBytes.toString());

		await gateway.connect(ccp,
			{ wallet: wallet, identity: receiverCustomerID, discovery: { enabled: true, asLocalhost: true } });

		network = await gateway.getNetwork(myChannel);
		contract = network.getContract(myChaincodeName);

		// Get accountReceiver information
		const accountReceiverBytes = await contract.evaluateTransaction('GetAccount', receiverAccountID);
		const accountReceiver = JSON.parse(accountReceiverBytes.toString());
	
		// Get exchange rate using fromCurrency and toCurrency
		const fromCurrency = accountSender.currency;
		const toCurrency = accountReceiver.currency;
		const exchangeRate = await getExchangeRate(fromCurrency, toCurrency);
	
		// Create payment object
		const payment = {
			paymentID: paymentID,
			senderAccountID: senderAccountID,
			receiverAccountID: receiverAccountID,
			senderCustomerID: senderCustomerID,
			receiverCustomerID: receiverCustomerID,
			amount: amount,
			exchangeRate: exchangeRate,
			date: date
		};
	
		let statefulTxn = contract.createTransaction('CreatePayment');
		await statefulTxn.submit(paymentID,senderAccountID,receiverAccountID,senderCustomerID,receiverCustomerID,amount,exchangeRate,date);
		console.log(JSON.stringify(payment));

		gateway.disconnect();
		return { success: true };

		}

		
	} catch (error) {
	  console.error(`Failed to create payment: ${error}`);
	  return { success: false, error: error.message };
	}
  }
  
  


function generatePaymentID() {
	// Generate a unique ID using a UUID library
	return uuid.v4();
}



async function getExchangeRate(fromCurrency, toCurrency) {
	return new Promise((resolve, reject) => {
		const options = {
		hostname: 'v6.exchangerate-api.com',
		port: 443,
		path: `/v6/be244c9bfe20c9c36234c05b/latest/${fromCurrency}`,
		method: 'GET',
		};
	
		const req = https.get(options, (res) => {
		let data = '';
	
		res.on('data', (chunk) => {
			data += chunk;
		});
	
		res.on('end', () => {
			const response = JSON.parse(data);
			const rate = response.conversion_rates[toCurrency];
			resolve(rate);
		});
		});
	
		req.on('error', (error) => {
		reject(error);
		});
	
		req.end();
	});
}


module.exports = {
	createPayment,
	fetchCustomerPayments
};
