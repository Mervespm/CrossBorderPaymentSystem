
# Blockchain Based Cross Border Payment System

Cross Border Payment is a private blockchain application based on Hyperledger. This project aims to facilitate the tracking and processing of cross-border payments.

## Installation

To run this project in a local development environment, follow the steps below:

### Prerequisites

- Docker installed
- Node.js and npm installed

### Terminal Commands

1. Navigate to the `cbps-network` directory:

```bash
cd ../../cbps-network
```

2. Start the network and create a channel by running the following command:

```bash
./network.sh up createChannel -c bankschannel -ca -s couchdb0
```

3. Deploy the chaincode by running the following command:

```bash
./network.sh deployCC -c bankschannel -ccn bank -ccp ../crossBorderPayment/chaincode-go/ -ccl go -ccep "OR('Org1MSP.peer','Org2MSP.peer')"
```

4. Navigate to the `crossBorderPayment/application` directory:

```bash
cd ../crossBorderPayment/application
```

5. Install the required dependencies using npm:

```bash
npm install
```

6. Enroll the admin users by running the following commands:

```bash
node enrollAdmin.js org1
node enrollAdmin.js org2
```

7. Start the application by running the following command:

```bash
node app.js
```

If there are no errors, the application will be accessible.

```

Make sure to include any additional instructions or details specific to your project after this section.
