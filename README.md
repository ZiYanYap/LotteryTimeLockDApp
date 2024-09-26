# LotteryTimeLockDApp
 A decentralised 4d lottery app with TimeLock.

# To setup
 ```
 npm init -y
 ```
 Make sure you have Truffle and Ganache installed.
 ```
 npm install truffle ganache
 ```
 Then install necessary packages:
 ```
 npm install
 ```
 Create a .env file to store your admin account's private key and address
 ```
 ADMIN_PRIVATE_KEY=xxx
 ADMIN_ADDRESS=xxx
 ```
 Make sure you have your workspace opening in ganache UI.
 
 Unit test the dApp (OPTIONAL)
 ```
 truffle compile
 truffle migrate --reset
 truffle test
 ```
 Run the dApp and scheduler.js (keep both running in two terminals)
 ```
 truffle compile
 truffle migrate --reset
 node src/js/server.js
 node src/js/scheduler.js
 ```
