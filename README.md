# Cross Border Payment

Cross Border Payment, Hyperledger tabanlı özel bir blok zinciri uygulamasıdır. Bu proje, sınır ötesi ödemelerin takibini ve işlenmesini kolaylaştırmayı amaçlar.

## Proje Açıklaması

Bu proje, Hyperledger çerçevesi üzerinde geliştirilmiş bir blok zinciri uygulamasıdır.
Sınır ötesi ödemelerin izlenmesi, onaylanması ve işlenmesi için kullanılan akıllı sözleşmeleri içerir.
Projede, farklı bankalar arasında yapılan işlemler için bir ağ oluşturulmuş ve ödeme süreçlerinin şeffaf bir şekilde takip edilmesi sağlanmıştır.

## Kurulum

Bu projeyi yerel bir geliştirme ortamında çalıştırmak için aşağıdaki adımları izleyebilirsiniz:


### Terminal Komutları

### Ağı Başlatma ve Uygulamayı Çalıştırma

1. `cbps-network` dizinine geçiş yapın:

```bash
cd cbps-network
```

2. Ağı başlatmak ve kanal oluşturmak için aşağıdaki komutu çalıştırın:

```bash
./network.sh up createChannel -c bankschannel -ca -s couchdb0
```

3. Zinciri kurmak için aşağıdaki komutu çalıştırın:

```bash
./network.sh deployCC -c bankschannel -ccn bank -ccp ../crossBorderPayment/chaincode-go/ -ccl go -ccep "OR('Org1MSP.peer','Org2MSP.peer')"
```

4. `crossBorderPayment/application` dizinine geçiş yapın:

```bash
cd ../crossBorderPayment/application
```

5. Gerekli bağımlılıkları yüklemek için npm kullanarak aşağıdaki komutu çalıştırın:

```bash
npm install
```

6. Admin kullanıcılarını kaydetmek için aşağıdaki komutları çalıştırın:

```bash
node enrollAdmin.js org1
node enrollAdmin.js org2
```

7. Uygulamayı başlatmak için aşağıdaki komutu çalıştırın:

```bash
node app.js
```
Hata almadıysanız, keşif arayüzü `http://localhost:3030` adresinden erişilebilir olacaktır.

### Keşif (Explorer) Ayarları

1. Keşif için gerekli dosyaları düzenleyin:

   - `cbps-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore` dizinindeki dosyanın adını alın.
   - `explorer/cbps-network.json` dosyasındaki `adminPrivateKey` değerinin sonunu değiştirin.

2. `explorer` dizinine geçiş yapın:

```bash
cd explorer
```

3. Docker konteynerlerini başlatmak için aşağıdaki komutu çalıştırın:

```bash
docker-compose up
```

4. Hata almadıysanız, keşif arayüzü `http://localhost:8080` adresinden erişilebilir olacaktır.

```
Docker konteynerlerini durdurma ve kaldırma işlemleri:

```bash
docker stop $(docker ps -a -q)
docker rm -f $(docker ps -aq)
docker system prune -a
docker volume prune
```

Docker konteyner ve görüntülerini listeleme:

```bash
docker ps -a
docker images -a
docker volume ls
```

### Visual Studio Code (VSCODE)

1. `cbps-network` dizinine geçiş yapın:

```bash
cd cbps-network
```

2. Ağı kapatmak için aşağıdaki komutu çalıştırın:

```bash
./network.sh down
```

3. `crossBorderPayment/application` dizinine geçiş yapın:

```bash
cd ../crossBorderPayment/application
```

4. `wallet` ve `node-modules` dizinlerini silin:

```bash
rm -rf wallet


rm -rf node-modules
```
