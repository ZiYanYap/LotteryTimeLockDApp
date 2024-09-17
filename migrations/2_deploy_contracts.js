const LotteryDApp = artifacts.require("LotteryDApp");

module.exports = function(deployer) {
  deployer.deploy(LotteryDApp, 1726567200);
};
