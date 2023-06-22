/*
SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"log"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	bank "github.com/hyperledger/fabric-samples/auction/chaincode-go/smart-contract"
)

func main() {
	bankSmartContract, err := contractapi.NewChaincode(&bank.SmartContract{})
	if err != nil {
		log.Panicf("Error creating bank chaincode: %v", err)
	}

	if err := bankSmartContract.Start(); err != nil {
		log.Panicf("Error starting bank chaincode: %v", err)
	}
}
