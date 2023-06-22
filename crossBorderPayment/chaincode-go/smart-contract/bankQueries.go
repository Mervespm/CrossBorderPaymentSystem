/*
SPDX-License-Identifier: Apache-2.0
*/

package bank

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// QueryBank allows all members of the channel to read a public bank
func (s *SmartContract) QueryBank(ctx contractapi.TransactionContextInterface, bankID string) (*Bank, error) {

	bankJSON, err := ctx.GetStub().GetState(bankID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bank object %v: %v", bankID, err)
	}
	if bankJSON == nil {
		return nil, fmt.Errorf("bank does not exist")
	}

	var bank *Bank
	err = json.Unmarshal(bankJSON, &bank)
	if err != nil {
		return nil, err
	}

	return bank, nil
}

func (s *SmartContract) QueryCustomer(ctx contractapi.TransactionContextInterface, custId string) (*Customer, error) {
	userAsBytes, err := ctx.GetStub().GetState(custId)
	if err != nil {
		return nil, fmt.Errorf("failed to get bank object %v: %v", custId, err)
	}
	if userAsBytes == nil {
		return nil, fmt.Errorf("%s does not exist", custId)
	}

	customer := new(Customer)
	_ = json.Unmarshal(userAsBytes, customer)

	return customer, nil
}

func (s *SmartContract) QueryAccount(ctx contractapi.TransactionContextInterface, accountID string) (*Account, error) {
	accountBytes, err := ctx.GetStub().GetState(accountID)
	if err != nil {
		return nil, fmt.Errorf("Failed to read account from world state: %v", err)
	}
	if accountBytes == nil {
		return nil, fmt.Errorf("Account does not exist: %s", accountID)
	}

	account := new(Account)
	err = json.Unmarshal(accountBytes, account)
	if err != nil {
		return nil, err
	}

	return account, nil
}
func (s *SmartContract) QueryPayments(ctx contractapi.TransactionContextInterface, accountID string) ([]*Payment, error) {
	accountBytes, err := ctx.GetStub().GetState(accountID)
	if err != nil {
		return nil, fmt.Errorf("Failed to read customer state from ledger: %v", err)
	}
	if accountBytes == nil {
		return nil, fmt.Errorf("Customer with ID %s does not exist", accountID)
	}

	var account Account
	err = json.Unmarshal(accountBytes, &account)
	if err != nil {
		return nil, fmt.Errorf("Failed to unmarshal customer state: %v", err)
	}

	payments := []*Payment{}
	for _, paymentID := range account.PaymentIDs {
		paymentBytes, err := ctx.GetStub().GetState(paymentID)
		if err != nil {
			return nil, fmt.Errorf("Failed to read account state from ledger: %v", err)
		}
		if paymentBytes == nil {
			return nil, fmt.Errorf("Account with ID %s does not exist", accountID)
		}

		var payment Payment
		err = json.Unmarshal(paymentBytes, &payment)
		if err != nil {
			return nil, fmt.Errorf("Failed to unmarshal account state: %v", err)
		}

		payments = append(payments, &payment)
	}

	return payments, nil
}

func (s *SmartContract) QueryCustomerAccounts(ctx contractapi.TransactionContextInterface, customerID string) ([]*Account, error) {
	customerBytes, err := ctx.GetStub().GetState(customerID)
	if err != nil {
		return nil, fmt.Errorf("Failed to read customer state from ledger: %v", err)
	}
	if customerBytes == nil {
		return nil, fmt.Errorf("Customer with ID %s does not exist", customerID)
	}

	var customer Customer
	err = json.Unmarshal(customerBytes, &customer)
	if err != nil {
		return nil, fmt.Errorf("Failed to unmarshal customer state: %v", err)
	}

	accounts := []*Account{}
	for _, accountID := range customer.AccountIDs {
		accountBytes, err := ctx.GetStub().GetState(accountID)
		if err != nil {
			return nil, fmt.Errorf("Failed to read account state from ledger: %v", err)
		}
		if accountBytes == nil {
			return nil, fmt.Errorf("Account with ID %s does not exist", accountID)
		}

		var account Account
		err = json.Unmarshal(accountBytes, &account)
		if err != nil {
			return nil, fmt.Errorf("Failed to unmarshal account state: %v", err)
		}

		accounts = append(accounts, &account)
	}

	return accounts, nil
}

func (s *SmartContract) QueryBankAccounts(ctx contractapi.TransactionContextInterface, bankID string) ([]*Account, error) {
	bankBytes, err := ctx.GetStub().GetState(bankID)
	if err != nil {
		return nil, fmt.Errorf("Failed to read customer state from ledger: %v", err)
	}
	if bankBytes == nil {
		return nil, fmt.Errorf("Customer with ID %s does not exist", bankID)
	}

	var bank Bank
	err = json.Unmarshal(bankBytes, &bank)
	if err != nil {
		return nil, fmt.Errorf("Failed to unmarshal customer state: %v", err)
	}

	accounts := []*Account{}
	for _, accountID := range bank.AccountIDs {
		accountBytes, err := ctx.GetStub().GetState(accountID)
		if err != nil {
			return nil, fmt.Errorf("Failed to read account state from ledger: %v", err)
		}
		if accountBytes == nil {
			return nil, fmt.Errorf("Account with ID %s does not exist", accountID)
		}

		var account Account
		err = json.Unmarshal(accountBytes, &account)
		if err != nil {
			return nil, fmt.Errorf("Failed to unmarshal account state: %v", err)
		}

		accounts = append(accounts, &account)
	}

	return accounts, nil
}

func (s *SmartContract) QueryCustomerPassword(ctx contractapi.TransactionContextInterface, custid string) (string, error) {
	customerBytes, err := ctx.GetStub().GetState(custid)
	if err != nil {
		return "", fmt.Errorf("Failed to read customer state from the ledger: %v", err)
	}
	if customerBytes == nil {
		return "", fmt.Errorf("Customer with ID %s does not exist", custid)
	}

	customer := new(Customer)
	err = json.Unmarshal(customerBytes, customer)
	if err != nil {
		return "", fmt.Errorf("Failed to unmarshal customer data: %v", err)
	}

	return customer.Password, nil
}

func (s *SmartContract) QueryCustomersByBank(ctx contractapi.TransactionContextInterface, bankID string) ([]*Customer, error) {
	iterator, err := ctx.GetStub().GetStateByPartialCompositeKey("Account", []string{bankID})
	if err != nil {
		return nil, fmt.Errorf("Failed to get accounts for bank %s: %v", bankID, err)
	}
	defer iterator.Close()

	customers := []*Customer{}
	for iterator.HasNext() {
		queryResponse, err := iterator.Next()
		if err != nil {
			return nil, fmt.Errorf("Failed to iterate over account data for bank %s: %v", bankID, err)
		}

		_, compositeKeyParts, err := ctx.GetStub().SplitCompositeKey(queryResponse.Key)
		if err != nil {
			return nil, fmt.Errorf("Failed to split composite key: %v", err)
		}

		accountID := compositeKeyParts[0]
		customerID := compositeKeyParts[1]

		customerBytes, err := ctx.GetStub().GetState(customerID)
		if err != nil {
			return nil, fmt.Errorf("Failed to get customer data for account %s: %v", accountID, err)
		}
		if customerBytes == nil {
			return nil, fmt.Errorf("Customer with ID %s does not exist for account %s", customerID, accountID)
		}

		var customer Customer
		err = json.Unmarshal(customerBytes, &customer)
		if err != nil {
			return nil, fmt.Errorf("Failed to unmarshal customer data for account %s: %v", accountID, err)
		}

		customers = append(customers, &customer)
	}

	return customers, nil
}
