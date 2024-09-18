const LotteryDApp = artifacts.require("LotteryDApp");

module.exports = function(deployer) {
  deployer.deploy(LotteryDApp, (parseInt(Date.now()/1000)) + 120);
};
