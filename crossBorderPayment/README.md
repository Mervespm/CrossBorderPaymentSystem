FROM TERMINAL;
docker stop $(docker ps -a -q)  ; docker rm -f $(docker ps -aq) ; docker system prune -a ; docker volume prune ; docker ps -a ; docker images -a ; docker volume ls;

FROM VSCODE;
cd cbps-network
./network.sh down
cd ../crossBorderPayment/application
rm -rf wallet
rm -rf node-modules

---------------------------------------------------------------
cd ../../cbps-network
./network.sh up createChannel -c bankschannel -ca -s couchdb0
./network.sh deployCC -c bankschannel -ccn bank -ccp ../crossBorderPayment/chaincode-go/ -ccl go -ccep "OR('Org1MSP.peer','Org2MSP.peer')"
cd ../crossBorderPayment/application
npm install
node enrollAdmin.js org1
node enrollAdmin.js org2
node app.js

FOR EXPLORER;
cbps-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore$ altındaki dosyanın adını al
explorer/cbps-network.json içindeki adminPrivateKey keyinin sonunu değiştir.
cd explorer
docker-compose up
