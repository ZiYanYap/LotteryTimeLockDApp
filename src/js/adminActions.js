// Load contract data
async function loadContractData() {
    if (lotteryContract) return;

    try {
        // Fetch contract ABI and networks configuration
        const response = await fetch('LotteryDApp.json');
        if (!response.ok) {
            throw new Error('Failed to load contract data from LotteryDApp.json');
        }

        const contractData = await response.json();
        const contractABI = contractData.abi;
        const networkId = await web3.eth.net.getId();

        // Check if contract is deployed on the current network
        const contractAddress = contractData.networks[networkId]?.address;
        if (!contractAddress) {
            throw new Error(`Contract is not deployed on the current network (ID: ${networkId}). Please switch networks.`);
        }

        // Initialize contract instance
        lotteryContract = new web3.eth.Contract(contractABI, contractAddress);
        console.log('Contract loaded successfully:', lotteryContract);

        // Fetch user accounts
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found. Please connect to MetaMask.');
        }

        userAddress = accounts[0];
        console.log('User Address:', userAddress);
    } catch (error) {
        console.error('Failed to load contract data:', error);
        alert(`Error: ${error.message}`);
    }
}

// Utility function to handle errors
function handleContractError(error) {
    let errorMessage = error.data?.message.split(" revert ")[1] || error.message;
    alert(`Error: ${errorMessage}`);
}

// General function to call and send transaction
async function executeContractMethod(method, args = [], onSuccessMessage) {
    await loadContractData();

    if (!userAddress) {
        alert('Please connect your MetaMask account first.');
        return;
    }

    try {
        await method.call({ from: userAddress, ...args });
        try {
            await method.send({ from: userAddress, ...args });
            alert(onSuccessMessage);
        } catch (sendError) {
            alert(`Transaction failed during send: ${sendError.message}`);
        }
    } catch (callError) {
        handleContractError(callError);
    }
}

// Set Developer Fee Percentage
async function setDeveloperFeePercentage(newFeePercentage) {
    const feePercentage = parseInt(newFeePercentage, 10);
    const method = lotteryContract.methods.setDeveloperFeePercentage(feePercentage);
    executeContractMethod(method, [], 'Developer fee percentage updated successfully!');
}

// Set Prize Percentages
async function setPrizePercentages(firstPrize, secondPrize, thirdPrize) {
    const method = lotteryContract.methods.setPrizePercentages(
        parseInt(firstPrize, 10),
        parseInt(secondPrize, 10),
        parseInt(thirdPrize, 10)
    );
    executeContractMethod(method, [], 'Prize percentages updated successfully!');
}

// Set Draw Interval and Offsets
async function setDrawAndOffsets(newDrawInterval, newCancellationOffset, newSalesCloseOffset) {
    const method = lotteryContract.methods.setDrawAndOffsets(
        parseInt(newDrawInterval, 10),
        parseInt(newCancellationOffset, 10),
        parseInt(newSalesCloseOffset, 10)
    );
    executeContractMethod(method, [], 'Draw interval and offsets updated successfully!');
}

// Execute Draw
async function executeDraw() {
    const method = lotteryContract.methods.executeDraw();
    executeContractMethod(method, [], 'Draw executed successfully!');
}

// Cancel Draw
async function cancelDraw() {
    const method = lotteryContract.methods.cancelDraw();
    executeContractMethod(method, [], 'Draw cancelled successfully!');
}

// Event listener for setting developer fee percentage
document.getElementById('feeForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const feePercentage = document.getElementById('feePercentage').value;
    setDeveloperFeePercentage(feePercentage);
});

// Event listener for setting prize percentages
document.getElementById('prizeForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const firstPrize = document.getElementById('firstPrizePercentage').value;
    const secondPrize = document.getElementById('secondPrizePercentage').value;
    const thirdPrize = document.getElementById('thirdPrizePercentage').value;
    setPrizePercentages(firstPrize, secondPrize, thirdPrize);
});

// Event listener for updating draw interval and offsets
document.getElementById('drawForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const drawInterval = document.getElementById('drawInterval').value;
    const cancellationOffset = document.getElementById('cancellationOffset').value;
    const salesCloseOffset = document.getElementById('salesCloseOffset').value;
    setDrawAndOffsets(drawInterval, cancellationOffset, salesCloseOffset);
});

document.getElementById('executeDrawBtn').addEventListener('click', executeDraw);
document.getElementById('cancelDrawBtn').addEventListener('click', cancelDraw);
