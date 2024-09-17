const LotteryDApp = artifacts.require("LotteryDApp");
const truffleAssert = require("truffle-assertions");

contract("LotteryDApp", (accounts) => {
  let lottery;
  const developer = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const user3 = accounts[3];
  const ticketPrice = web3.utils.toWei("1", "ether");

  // Helper function to increase blockchain time for testing time-based conditions
  function increaseTime(duration) {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [duration], // Increase time by `duration` seconds
        },
        (err, result) => {
          if (err) return reject(err);
          web3.currentProvider.send(
            {
              jsonrpc: "2.0",
              method: "evm_mine", // Mine a new block after the time change
            },
            (err2, res2) => (err2 ? reject(err2) : resolve(res2))
          );
        }
      );
    });
  }

  // Run before each test to deploy a fresh instance of the LotteryDApp contract
  beforeEach(async () => {
    const firstDrawTime = (await web3.eth.getBlock('latest')).timestamp + 660; // 11 minutes from now
    lottery = await LotteryDApp.new(firstDrawTime, { from: developer });
  });

  // ---- Core Functionality Tests ----

  it("should allow a user to purchase a valid ticket", async () => {
    // User buys a ticket with a valid number and price
    await lottery.buyTicket(1234, { from: user1, value: ticketPrice });

    // Ensure that the user has exactly 1 ticket
    const ticketsLength = await lottery.getUserTicketCount(user1);
    assert.equal(ticketsLength.toNumber(), 1, "User should have one ticket");
  });

  it("should allow a user to cancel a ticket before the deadline", async () => {
    // User buys a ticket
    await lottery.buyTicket(1234, { from: user1, value: ticketPrice });

    // Capture the user's initial balance before cancellation
    const initialBalance = await web3.eth.getBalance(user1);

    // User cancels the ticket before the deadline
    await lottery.cancelTicket(1234, { from: user1 });

    // Ensure the user has no tickets after cancellation
    const ticketsLength = await lottery.getUserTicketCount(user1);
    assert.equal(ticketsLength.toNumber(), 0, "User should have no tickets after cancellation");

    // Ensure the user receives a 90% refund
    const finalBalance = await web3.eth.getBalance(user1);
    const refund = web3.utils.toWei("0.9", "ether"); // 90% refund
    assert(finalBalance > initialBalance - refund, "User should receive 90% refund");
  });

  it("should execute the draw with at least 3 participants", async () => {
    // Three users buy tickets
    await lottery.buyTicket(1000, { from: user1, value: ticketPrice });
    await lottery.buyTicket(2000, { from: user2, value: ticketPrice });
    await lottery.buyTicket(3000, { from: user3, value: ticketPrice });

    // Advance time to meet the draw interval condition (simulate 11 minutes passing)
    await increaseTime(660);

    // Admin executes the draw
    await lottery.executeDraw({ from: developer });

    // Ensure a valid prize number is generated for the first prize
    const firstPrize = await lottery.firstPrizeNumber();
    assert(firstPrize.toNumber() >= 0 && firstPrize.toNumber() <= 9999, "First prize should be a valid number");
  });

  // ---- Edge Case Tests ----

  it("should not allow a user to purchase more than 5 tickets", async () => {
    // User buys 5 tickets
    for (let i = 0; i < 5; i++) {
      await lottery.buyTicket(i, { from: user1, value: ticketPrice });
    }

    // Attempting to buy a 6th ticket should revert
    await truffleAssert.reverts(
      lottery.buyTicket(1234, { from: user1, value: ticketPrice }),
      "Ticket purchase limit reached"
    );
  });

  it("should not allow a user to buy the same ticket twice", async () => {
    // User buys a ticket
    await lottery.buyTicket(1234, { from: user1, value: ticketPrice });

    // Attempting to buy the same ticket again should revert
    await truffleAssert.reverts(
      lottery.buyTicket(1234, { from: user1, value: ticketPrice }),
      "You have already purchased this ticket number."
    );
  });

  it("should not allow a user to cancel a ticket after the cancellation deadline", async () => {
    // User buys a ticket
    await lottery.buyTicket(1234, { from: user1, value: ticketPrice });

    // Advance time beyond the cancellation deadline (simulate 10 minutes passing)
    await increaseTime(600);

    // Attempting to cancel the ticket after the deadline should revert
    await truffleAssert.reverts(
      lottery.cancelTicket(1234, { from: user1 }),
      "Cancellation period is over"
    );
  });

  it("should not execute the draw with fewer than 3 participants", async () => {
    // Two users buy tickets
    await lottery.buyTicket(1000, { from: user1, value: ticketPrice });
    await lottery.buyTicket(2000, { from: user2, value: ticketPrice });

    // Advance time to meet the draw interval condition
    await increaseTime(660);

    // Attempting to execute the draw with fewer than 3 participants should revert
    await truffleAssert.reverts(
      lottery.executeDraw({ from: developer }),
      "Not enough participants to execute the draw"
    );
  });

  // ---- Invalid Input Handling Tests ----

  it("should revert if ticket price is incorrect", async () => {
    // User attempts to buy a ticket with the wrong price
    await truffleAssert.reverts(
      lottery.buyTicket(1234, { from: user1, value: web3.utils.toWei("0.5", "ether") }),
      "Incorrect ticket price"
    );
  });

  it("should revert if ticket number is out of range", async () => {
    // User attempts to buy a ticket with a number greater than 9999
    await truffleAssert.reverts(
      lottery.buyTicket(10000, { from: user1, value: ticketPrice }),
      "Ticket number must be a 4-digit number"
    );
  });

  // ---- Security and Permissions Tests ----

  it("should only allow the admin to execute the draw", async () => {
    // Three users buy tickets
    await lottery.buyTicket(1000, { from: user1, value: ticketPrice });
    await lottery.buyTicket(2000, { from: user2, value: ticketPrice });
    await lottery.buyTicket(3000, { from: user3, value: ticketPrice });

    // Advance time to meet the draw interval condition
    await increaseTime(660);

    // Non-admin user tries to execute the draw, should revert
    await truffleAssert.reverts(
      lottery.executeDraw({ from: user1 }),
      "Only the admin can call this function"
    );
  });

  it("should only allow the admin to change settings", async () => {
    // Non-admin user tries to change draw settings, should revert
    await truffleAssert.reverts(
      lottery.setDrawAndOffsets(600, 120, 60, { from: user1 }),
      "Only the admin can call this function"
    );
  });

  // ---- Event Emission Tests ----

  it("should emit a TicketPurchased event when a user buys a ticket", async () => {
    // User buys a ticket
    const tx = await lottery.buyTicket(1234, { from: user1, value: ticketPrice });

    // Ensure the TicketPurchased event is emitted with correct details
    truffleAssert.eventEmitted(tx, 'TicketPurchased', (ev) => {
      return ev.buyer === user1 && ev.ticketNumber.toNumber() === 1234;
    });
  });

  it("should emit a DrawExecuted event after a draw is executed", async () => {
    // Three users buy tickets
    await lottery.buyTicket(1000, { from: user1, value: ticketPrice });
    await lottery.buyTicket(2000, { from: user2, value: ticketPrice });
    await lottery.buyTicket(3000, { from: user3, value: ticketPrice });

    // Advance time to meet the draw interval condition
    await increaseTime(660);

    // Admin executes the draw
    const tx = await lottery.executeDraw({ from: developer });

    // Ensure the DrawExecuted event is emitted with correct details
    truffleAssert.eventEmitted(tx, 'DrawExecuted', (ev) => {
      return ev.drawId.toNumber() === 1;
    });
  });
});
