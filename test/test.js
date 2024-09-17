const LotteryDApp = artifacts.require("LotteryDApp");
const truffleAssert = require("truffle-assertions");

contract("LotteryDApp", (accounts) => {
  let lottery;
  const developer = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];

  // Before each test, deploy a fresh instance of the LotteryDApp
  beforeEach(async () => {
    const firstDrawTime = (await web3.eth.getBlock('latest')).timestamp + 660; // 11 minutes from now
    lottery = await LotteryDApp.new(firstDrawTime, { from: developer });
  });

  // Helper function to increase time
  function increaseTime(duration) {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [duration], // Increase time by `duration` seconds
        },
        (err, result) => {
          if (err) { return reject(err); }
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

  it("should deploy with correct initial values", async () => {
    const drawId = await lottery.drawId();
    const ticketPrice = await lottery.ticketPrice();
    const lastDrawTime = await lottery.lastDrawTime();
    
    assert.equal(drawId.toNumber(), 1, "Initial draw ID should be 1");
    assert.equal(web3.utils.fromWei(ticketPrice, "ether"), 1, "Ticket price should be 1 ether");
    assert(lastDrawTime.toNumber() > 0, "Last draw time should be initialized");
  });

  it("should allow a user to purchase a ticket", async () => {
    await lottery.buyTicket(1234, { from: user1, value: web3.utils.toWei("1", "ether") });

    // Get the length of the user's tickets array
    const ticketsLength = await lottery.getUserTicketCount(user1);  // Draw ID is 1 for the first draw

    // Iterate through the array to get each ticket
    let ticketNumbers = [];
    for (let i = 0; i < ticketsLength.toNumber(); i++) {
      const ticket = await lottery.userTickets(1, user1, i);  // drawId = 1, user = user1, index = i
      ticketNumbers.push(ticket.toNumber());
    }

    assert.equal(ticketNumbers.length, 1, "User should have one ticket");
    assert.equal(ticketNumbers[0], 1234, "Ticket number should be 1234");
  });

  it("should not allow a user to purchase more than 5 tickets", async () => {
    // User buys 5 tickets
    for (let i = 0; i < 5; i++) {
      await lottery.buyTicket(i, { from: user1, value: web3.utils.toWei("1", "ether") });
    }

    // Attempt to buy a 6th ticket
    await truffleAssert.reverts(
      lottery.buyTicket(1234, { from: user1, value: web3.utils.toWei("1", "ether") }),
      "Ticket purchase limit reached"
    );
  });

  it("should allow a user to cancel a ticket before the deadline", async () => {
    await lottery.buyTicket(4321, { from: user1, value: web3.utils.toWei("1", "ether") });
    
    const initialBalance = await web3.eth.getBalance(user1);
    
    await lottery.cancelTicket(4321, { from: user1 });

    // Get the updated length of the user's tickets array
    const ticketsLength = await lottery.getUserTicketCount(user1);
    assert.equal(ticketsLength.toNumber(), 0, "User should have no tickets after cancellation");

    const finalBalance = await web3.eth.getBalance(user1);
    const refund = web3.utils.toWei("0.9", "ether"); // 90% refund
    assert(finalBalance > initialBalance - refund, "User should receive 90% refund");
  });

  it("should not allow a user to buy the same ticket twice in the same draw", async () => {
    await lottery.buyTicket(1234, { from: user1, value: web3.utils.toWei("1", "ether") });

    // Try buying the same ticket again
    await truffleAssert.reverts(
      lottery.buyTicket(1234, { from: user1, value: web3.utils.toWei("1", "ether") }),
      "You have already purchased this ticket number."
    );
  });

  it("should execute the draw only if there are at least 3 participants", async () => {
    // Users purchase tickets
    await lottery.buyTicket(1000, { from: user1, value: web3.utils.toWei("1", "ether") });
    await lottery.buyTicket(2000, { from: user2, value: web3.utils.toWei("1", "ether") });

    // Not enough participants (only 2 participants)
    // Advance time to meet the draw interval requirement
    await increaseTime(660); // Simulate 11 minutes passing

    // Now try to execute the draw with only 2 participants
    await truffleAssert.reverts(
      lottery.executeDraw({ from: developer }),
      "Not enough participants to execute the draw"
    );

    // Add a third participant
    await lottery.buyTicket(3000, { from: accounts[3], value: web3.utils.toWei("1", "ether") });

    // Now the draw should execute successfully
    await lottery.executeDraw({ from: developer });
  });
});
