/*
SPDX-License-Identifier: Apache-2.0
*/

package bank

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
	contractapi.Contract
}

// Bank data
type Bank struct {
	Name         string   `json:"name"`
	BankID       string   `json:"bankID"`
	BankAdminID  string   `json:"bankAdminID"`
	Password     string   `json:"password"`
	Country      string   `json:"country"`
	Currency     string   `json:"currency"`
	Reserves     float64  `json:"reserves"`
	AccountIDs   []string `json:"accountIDs"`
	ExchangeRate float64  `json:"exchangeRate"`
}

// Define the customer structure, with 3 properties.  Structure tags are used by encoding/json library
type Customer struct {
	Name       string   `json:"name"`
	Surname    string   `json:"surname"`
	CustomerID string   `json:"customerID"`
	Password   string   `json:"password"`
	AccountIDs []string `json:"accountIDs"`
}

type Account struct {
	AccountID  string   `json:"id"`
	CustomerID string   `json:"customerID"`
	BankID     string   `json:"bankID"`
	Balance    float64  `json:"balance"`
	Currency   string   `json:"currency"`
	PaymentIDs []string `json:"paymentIDs"`
}

type Payment struct {
	PaymentID          string  `json:"paymentID"`
	SenderCustomerID   string  `json:"senderCustomerID"`
	ReceiverCustomerID string  `json:"receiverCustomerID"`
	SenderAccountID    string  `json:"senderAccountID"`
	ReceiverAccountID  string  `json:"receiverAccountID"`
	Amount             float64 `json:"amount"`
	ExchangeRate       float64 `json:"exchangeRate"`
	Date               string  `json:"date"`
}

// CreateBank creates on bank on the public channel. The identity that
// submits the transacion becomes the seller of the bank
func (s *SmartContract) CreateBank(ctx contractapi.TransactionContextInterface, bankid string, bankadminid string, name string, password string, country string, currency string, reserves float64, exchangeRate float64) error {

	bankadminid, error := s.GetSubmittingClientIdentity(ctx)
	if error != nil {
		return fmt.Errorf("failed to get client identity %v", error)
	}

	bank := Bank{
		Name:         name,
		BankID:       bankid,
		BankAdminID:  bankadminid,
		Country:      country,
		Currency:     currency,
		Reserves:     reserves,
		Password:     password,
		AccountIDs:   []string{},
		ExchangeRate: exchangeRate}

	bankAsBytes, _ := json.Marshal(bank)

	if error != nil {
		return fmt.Errorf("failed to marshal bank object: %v", error)
	}

	return ctx.GetStub().PutState(bankid, bankAsBytes)
}

func (s *SmartContract) CreateCustomer(ctx contractapi.TransactionContextInterface, custid string, password string, name string, surname string) error {

	customer := Customer{
		Name:       name,
		Surname:    surname,
		CustomerID: custid,
		Password:   password,
		AccountIDs: []string{},
	}
	userAsBytes, _ := json.Marshal(customer)
	return ctx.GetStub().PutState(custid, userAsBytes)

}

func (s *SmartContract) CreateAccount(ctx contractapi.TransactionContextInterface, id string, customerID string, bankID string, balance float64) error {

	// Update the associated bank with the account ID
	bankBytes, err := ctx.GetStub().GetState(bankID)
	if err != nil {
		return err
	}
	if bankBytes == nil {
		return fmt.Errorf("Bank with ID %s does not exist", bankID)
	}
	var bank Bank
	err = json.Unmarshal(bankBytes, &bank)
	if err != nil {
		return err
	}
	bank.AccountIDs = append(bank.AccountIDs, id)
	bankBytes, _ = json.Marshal(bank)
	err = ctx.GetStub().PutState(bankID, bankBytes)
	if err != nil {
		return err
	}

	// Update the associated customer with the account ID
	customerBytes, err := ctx.GetStub().GetState(customerID)
	if err != nil {
		return err
	}
	if customerBytes == nil {
		return fmt.Errorf("Customer with ID %s does not exist", customerID)
	}
	var customer Customer
	err = json.Unmarshal(customerBytes, &customer)
	if err != nil {
		return err
	}
	customer.AccountIDs = append(customer.AccountIDs, id)
	customerBytes, _ = json.Marshal(customer)
	err = ctx.GetStub().PutState(customerID, customerBytes)
	if err != nil {
		return err
	}

	account := Account{
		AccountID:  id,
		CustomerID: customerID,
		BankID:     bankID,
		Balance:    balance,
		Currency:   bank.Currency,
		PaymentIDs: []string{},
	}
	accountAsBytes, _ := json.Marshal(account)
	err1 := ctx.GetStub().PutState(id, accountAsBytes)
	if err1 != nil {
		return err1
	}

	return nil
}

func (s *SmartContract) GetAccount(ctx contractapi.TransactionContextInterface, accountID string) (*Account, error) {
	accountBytes, err := ctx.GetStub().GetState(accountID)
	if err != nil {
		return nil, fmt.Errorf("failed to read account state: %v", err)
	}
	if accountBytes == nil {
		return nil, fmt.Errorf("account %s does not exist", accountID)
	}

	var account Account
	err = json.Unmarshal(accountBytes, &account)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal account JSON: %v", err)
	}

	return &account, nil
}

// Define the CreatePayment function
func (s *SmartContract) CreatePayment(ctx contractapi.TransactionContextInterface, paymentID string, senderAccountID string, receiverAccountID string, senderCustomerID string, receiverCustomerID string, amount float64, exchangeRate float64, date string) error {
	payment := Payment{
		PaymentID:          paymentID,
		SenderCustomerID:   senderCustomerID,
		ReceiverCustomerID: receiverCustomerID,
		SenderAccountID:    senderAccountID,
		ReceiverAccountID:  receiverAccountID,
		Amount:             amount,
		ExchangeRate:       exchangeRate,
		Date:               date,
	}

	// Save the payment in the world state
	paymentJSON, err := json.Marshal(payment)
	if err != nil {
		return fmt.Errorf("failed to marshal payment JSON: %v", err)
	}

	err = ctx.GetStub().PutState(paymentID, paymentJSON)
	if err != nil {
		return fmt.Errorf("failed to put payment state: %v", err)
	}

	// Update sender's account balance
	err = s.updateAccountBalance(ctx, senderAccountID, -amount, 1, paymentID)
	if err != nil {
		return fmt.Errorf("failed to update sender's account balance: %v", err)
	}

	// Update receiver's account balance
	err = s.updateAccountBalance(ctx, receiverAccountID, amount, exchangeRate, paymentID)
	if err != nil {
		return fmt.Errorf("failed to update receiver's account balance: %v", err)
	}

	return nil
}

func (s *SmartContract) updateAccountBalance(ctx contractapi.TransactionContextInterface, accountID string, amount float64, exchangeRate float64, paymentID string) error {
	accountJSON, err := ctx.GetStub().GetState(accountID)
	if err != nil {
		return fmt.Errorf("failed to read account state: %v", err)
	}
	if accountJSON == nil {
		return fmt.Errorf("account %s does not exist", accountID)
	}

	var account Account
	err = json.Unmarshal(accountJSON, &account)
	if err != nil {
		return fmt.Errorf("failed to unmarshal account JSON: %v", err)
	}

	// Convert the amount to the account's currency
	convertedAmount := amount * exchangeRate
	account.Balance += convertedAmount
	account.PaymentIDs = append(account.PaymentIDs, paymentID)
	err = s.UpdateBankReserves(ctx, account.BankID, convertedAmount)
	if err != nil {
		return fmt.Errorf("failed to update bank reserves: %v", err)
	}
	accountJSON, err = json.Marshal(account)
	if err != nil {
		return fmt.Errorf("failed to marshal account JSON: %v", err)
	}

	err = ctx.GetStub().PutState(accountID, accountJSON)
	if err != nil {
		return fmt.Errorf("failed to put account state: %v", err)
	}

	return nil
}

func (s *SmartContract) UpdateBankReserves(ctx contractapi.TransactionContextInterface, bankID string, amount float64) error {
	bankJSON, err := ctx.GetStub().GetState(bankID)
	if err != nil {
		return fmt.Errorf("failed to read bank state: %v", err)
	}
	if bankJSON == nil {
		return fmt.Errorf("bank %s does not exist", bankID)
	}

	var bank Bank
	err = json.Unmarshal(bankJSON, &bank)
	if err != nil {
		return fmt.Errorf("failed to unmarshal bank JSON: %v", err)
	}

	bank.Reserves += amount
	bankJSON, err = json.Marshal(bank)
	if err != nil {
		return fmt.Errorf("failed to marshal bank JSON: %v", err)
	}

	err = ctx.GetStub().PutState(bankID, bankJSON)
	if err != nil {
		return fmt.Errorf("failed to put bank state: %v", err)
	}
	return nil
}

func (s *SmartContract) UpdateProfile(ctx contractapi.TransactionContextInterface, custid string, name string, surname string, password string) error {
	customerAsBytes, err := ctx.GetStub().GetState(custid)
	if err != nil {
		return fmt.Errorf("Failed to get customer: %v", err)
	}
	if customerAsBytes == nil {
		return fmt.Errorf("Customer with custid %s does not exist", custid)
	}

	customer := Customer{}
	err = json.Unmarshal(customerAsBytes, &customer)
	if err != nil {
		return fmt.Errorf("Failed to unmarshal customer: %v", err)
	}

	customer.Name = name
	customer.Surname = surname
	customer.Password = password

	customerAsBytes, err = json.Marshal(customer)
	if err != nil {
		return fmt.Errorf("Failed to marshal customer: %v", err)
	}

	return ctx.GetStub().PutState(custid, customerAsBytes)
}

func (s *SmartContract) UpdateBankProfile(ctx contractapi.TransactionContextInterface, bankID string, bankAdminID string, name string, reserves float64, country string) error {
	bankAsBytes, err := ctx.GetStub().GetState(bankID)
	if err != nil {
		return fmt.Errorf("Failed to get customer: %v", err)
	}
	if bankAsBytes == nil {
		return fmt.Errorf("Customer with custid %s does not exist", bankID)
	}

	bank := Bank{}
	err = json.Unmarshal(bankAsBytes, &bank)
	if err != nil {
		return fmt.Errorf("Failed to unmarshal customer: %v", err)
	}

	bank.Name = name
	bank.Reserves = reserves
	bank.Country = country
	bankAsBytes, err = json.Marshal(bank)
	if err != nil {
		return fmt.Errorf("Failed to marshal customer: %v", err)
	}

	return ctx.GetStub().PutState(bankID, bankAsBytes)
}

func (s *SmartContract) DeleteAccount(ctx contractapi.TransactionContextInterface, accountID string) error {
	// Silinecek hesabı bulmak için durumu alın
	accountBytes, err := ctx.GetStub().GetState(accountID)
	if err != nil {
		return err
	}
	if accountBytes == nil {
		return fmt.Errorf("Account with ID %s does not exist", accountID)
	}

	// Hesabı sil
	err = ctx.GetStub().DelState(accountID)
	if err != nil {
		return fmt.Errorf("failed to delete account: %v", err)
	}

	// İlgili bankayı güncelle
	account := new(Account)
	err = json.Unmarshal(accountBytes, account)
	if err != nil {
		return err
	}

	bankBytes, err := ctx.GetStub().GetState(account.BankID)
	if err != nil {
		return err
	}
	if bankBytes == nil {
		return fmt.Errorf("Bank with ID %s does not exist", account.BankID)
	}
	var bank Bank
	err = json.Unmarshal(bankBytes, &bank)
	if err != nil {
		return err
	}

	for i, accID := range bank.AccountIDs {
		if accID == accountID {
			// Hesabı bankadan kaldır
			bank.AccountIDs = append(bank.AccountIDs[:i], bank.AccountIDs[i+1:]...)
			break
		}
	}

	bankBytes, _ = json.Marshal(bank)
	err = ctx.GetStub().PutState(account.BankID, bankBytes)
	if err != nil {
		return err
	}

	// İlgili müşteriyi güncelle
	customerBytes, err := ctx.GetStub().GetState(account.CustomerID)
	if err != nil {
		return err
	}
	if customerBytes == nil {
		return fmt.Errorf("Customer with ID %s does not exist", account.CustomerID)
	}
	var customer Customer
	err = json.Unmarshal(customerBytes, &customer)
	if err != nil {
		return err
	}

	for i, accID := range customer.AccountIDs {
		if accID == accountID {
			// Hesabı müşteriden kaldır
			customer.AccountIDs = append(customer.AccountIDs[:i], customer.AccountIDs[i+1:]...)
			break
		}
	}

	customerBytes, _ = json.Marshal(customer)
	err = ctx.GetStub().PutState(account.CustomerID, customerBytes)
	if err != nil {
		return err
	}

	return nil
}

func parseExchangeRateFromJSON(jsonData []byte, targetCurrency string) (float64, error) {
	// JSON yanıtını bir struct yapısına dönüştürmek için bir struct tanımlayın
	type ExchangeRateResponse struct {
		Rates map[string]float64 `json:"rates"`
	}

	// JSON yanıtını struct yapısına dönüştürün
	var response ExchangeRateResponse
	err := json.Unmarshal(jsonData, &response)
	if err != nil {
		return 0.0, fmt.Errorf("Failed to unmarshal JSON response: %v", err)
	}

	// Hedef para birimi için döviz kurunu elde edin
	rate, ok := response.Rates[targetCurrency]
	if !ok {
		return 0.0, fmt.Errorf("Exchange rate for target currency '%s' not found", targetCurrency)
	}

	return rate, nil
}
func (s *SmartContract) UpdateBalance(ctx contractapi.TransactionContextInterface, accountID string, amount float64) error {
	accountJSON, err := ctx.GetStub().GetState(accountID)
	if err != nil {
		return fmt.Errorf("failed to read account state: %v", err)
	}
	if accountJSON == nil {
		return fmt.Errorf("account %s does not exist", accountID)
	}

	var account Account
	err = json.Unmarshal(accountJSON, &account)
	if err != nil {
		return fmt.Errorf("failed to unmarshal account JSON: %v", err)
	}

	// Convert the amount to the account's currency
	account.Balance += amount
	if err != nil {
		return fmt.Errorf("failed to update bank reserves: %v", err)
	}
	accountJSON, err = json.Marshal(account)
	if err != nil {
		return fmt.Errorf("failed to marshal account JSON: %v", err)
	}

	err = ctx.GetStub().PutState(accountID, accountJSON)
	if err != nil {
		return fmt.Errorf("failed to put account state: %v", err)
	}

	return nil
}

func main() {

	chaincode, err := contractapi.NewChaincode(new(SmartContract))

	if err != nil {
		fmt.Printf("Error create fabcar chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting fabcar chaincode: %s", err.Error())
	}
}
