const LotteryDApp = artifacts.require("LotteryDApp");

module.exports = function(deployer) {
  deployer.deploy(LotteryDApp, (Math.floor(Date.now() / 1000) + 360)); // datetime now + 6 minutes, adjustable
};
