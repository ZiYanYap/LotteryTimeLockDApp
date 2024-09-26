const { Web3 } = require('web3');
require('dotenv').config();  // Load environment variables from a .env file

// Setup Web3 and Contract Information
const web3 = new Web3('http://127.0.0.1:7545');
const contractJSON = require('../../build/contracts/LotteryDApp.json');
const contractABI = contractJSON.abi;
const networkId = '5777';  // Replace with your network ID
const contractAddress = contractJSON.networks[networkId].address;

const lotteryContract = new web3.eth.Contract(contractABI, contractAddress);
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
const adminAddress = process.env.ADMIN_ADDRESS;

// ====================== Utility Functions ======================

// Send a fake transaction to mine a block and advance time in Ganache
async function sendFakeTransaction() {
    try {
        const tx = {
            from: adminAddress,
            to: adminAddress,
            value: '0',
            gas: 21000  // Minimum gas for a basic transaction
        };
        await web3.eth.sendTransaction(tx);
    } catch (error) {
        console.error('Error sending fake transaction:', error);
    }
}

// Get the next draw time from the contract
async function getNextDrawTime() {
    try {
        const nextDrawTime = await lotteryContract.methods.getNextDrawTime().call();
        return parseInt(nextDrawTime);
    } catch (error) {
        console.error('Error fetching next draw time:', error);
        return null;
    }
}

// Get the current block time as BigInt
async function getCurrentBlockTime() {
    try {
        const latestBlock = await web3.eth.getBlock("latest");
        return BigInt(latestBlock.timestamp);
    } catch (error) {
        console.error('Error fetching block time:', error);
        return null;
    }
}

// Get the unique participants count from the contract
async function getUniqueParticipantsCount() {
    try {
        const participantsCount = await lotteryContract.methods.uniqueParticipantsCount().call();
        return parseInt(participantsCount);
    } catch (error) {
        console.error('Error fetching uniqueParticipantsCount:', error);
        return null;
    }
}

// ====================== Draw Functions ======================

// Execute the lottery draw
async function executeDrawAutomatically() {
    try {
        const gasEstimate = await lotteryContract.methods.executeDraw().estimateGas({ from: adminAddress });

        const tx = {
            from: adminAddress,
            to: contractAddress,
            gas: gasEstimate,
            maxPriorityFeePerGas: web3.utils.toWei('2', 'gwei'),
            maxFeePerGas: web3.utils.toWei('50', 'gwei'),
            data: lotteryContract.methods.executeDraw().encodeABI()
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, adminPrivateKey);
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        console.log('Draw executed successfully!');
    } catch (error) {
        console.error('Error executing the draw:', error);
    }
}

// Cancel the draw if there are not enough participants
async function cancelDraw() {
    try {
        const gasEstimate = await lotteryContract.methods.cancelDraw().estimateGas({ from: adminAddress });

        const tx = {
            from: adminAddress,
            to: contractAddress,
            gas: gasEstimate,
            maxPriorityFeePerGas: web3.utils.toWei('2', 'gwei'),
            maxFeePerGas: web3.utils.toWei('50', 'gwei'),
            data: lotteryContract.methods.cancelDraw().encodeABI()
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, adminPrivateKey);
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        console.log('Draw canceled successfully!');
    } catch (error) {
        console.error('Error canceling the draw:', error);
    }
}

// ====================== Draw Execution Logic ======================

// Main logic to either execute or cancel the draw based on participant count
async function executeDrawOrCancel() {
    try {
        const nextDrawTime = BigInt(await getNextDrawTime());
        const participantsCount = await getUniqueParticipantsCount();
        const currentTime = Math.floor(Date.now() / 1000);  // Current time in seconds

        // Check if the current time is less than the next draw time, indicating a possible manual cancellation
        if (currentTime < nextDrawTime) {
            console.log("Draw was manually cancelled, scheduling the next draw.");
            await scheduleNextDraw();  // Schedule the next draw
            return;  // Exit early
        }

        // Ensure block time is updated by sending a fake transaction
        await sendFakeTransaction();

        // If participant count is sufficient, check if the draw can be executed
        if (participantsCount >= 3) {
            const newBlockTime = await getCurrentBlockTime();
            if (newBlockTime >= nextDrawTime) {
                await executeDrawAutomatically();
            }
        } else {
            await cancelDraw();
        }

        // Continue scheduling the next draw after the current one is handled
        await scheduleNextDraw();

    } catch (error) {
        console.error("Error during draw execution or cancellation:", error);
        // Continue scheduling even if an error occurs
        await scheduleNextDraw();
    }
}

// ====================== Scheduler Logic ======================

// Schedule the next draw based on the next draw time
async function scheduleNextDraw() {
    try {
        const nextDrawTime = await getNextDrawTime();
        const currentTime = Math.floor(Date.now() / 1000);  // Get current system time in seconds
        const timeUntilNextDraw = nextDrawTime - currentTime;

        if (timeUntilNextDraw > 0) {
            console.log(`Next draw scheduled in ${timeUntilNextDraw} seconds.`);
            setTimeout(executeDrawOrCancel, timeUntilNextDraw * 1000);  // Convert to milliseconds
        } else {
            console.log("Next draw time has already passed. Executing immediately.");
            await executeDrawOrCancel();
        }
    } catch (error) {
        console.error('Error scheduling the next draw:', error);
    }
}

// Start the scheduler by scheduling the first draw
scheduleNextDraw();