const LotteryDApp = artifacts.require("LotteryDApp");

module.exports = function(deployer) {
  deployer.deploy(LotteryDApp, Date.now() + 660);
};
