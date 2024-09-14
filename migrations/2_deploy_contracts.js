const LotteryDApp = artifacts.require("Lottery");

module.exports = function(deployer) {
  deployer.deploy(LotteryDApp);
};
