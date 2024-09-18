// Load contract data
async function loadContractData() {
    if (lotteryContract) return;

    try {
        // Fetch contract ABI and networks configuration
        const response = await fetch('LotteryDApp.json');
        if (!response.ok) throw new Error('Failed to load contract data from LotteryDApp.json');

        const contractData = await response.json();
        const contractABI = contractData.abi;
        const networkId = await web3.eth.net.getId();
        const contractAddress = contractData.networks[networkId]?.address;
        if (!contractAddress) throw new Error(`Contract is not deployed on the current network (ID: ${networkId}). Please switch networks.`);

        // Initialize contract instance
        lotteryContract = new web3.eth.Contract(contractABI, contractAddress);
        console.log('Contract loaded:', lotteryContract);

        // Fetch user accounts
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) throw new Error('No accounts found. Please connect to MetaMask.');

        userAddress = accounts[0].toLowerCase();
        console.log('User Address:', userAddress);
    } catch (error) {
        console.error('Contract data loading error:', error);
        alert(`Error: ${error.message}`);
    }
}

async function validateAndLoadContractData() {
    await loadContractData();
    if (!userAddress) {
        alert('Please connect your MetaMask account first.');
        return false;
    }
    return true;
}

// Set Developer Fee Percentage
async function setDeveloperFeePercentage(newFeePercentage) {
    if (!(await validateAndLoadContractData())) return;

    const developerAddress = await lotteryContract.methods.developer().call();
    const feePercentage = parseInt(newFeePercentage);

    try {
        await lotteryContract.methods.setDeveloperFeePercentage(feePercentage).send({ from: userAddress });
        alert('Developer fee percentage updated successfully!');
    } catch (error) {
        if (userAddress !== developerAddress.toLowerCase()) {
            alert('Only the admin can call this function');
        } else if (feePercentage < 0) {
            alert('Developer fee percentage must cannot be negative');
        } else if (feePercentage > 20) {
            alert("Developer fee percentage must be <= 20%");
        } else {
            alert('Transaction failed');
        }
    }
}

// Set Prize Percentages
async function setPrizePercentages(firstPrize, secondPrize, thirdPrize) {
    if (!(await validateAndLoadContractData())) return;

    const developerAddress = await lotteryContract.methods.developer().call();
    const firstPrizePercentage = parseInt(firstPrize);
    const secondPrizePercentage = parseInt(secondPrize);
    const thirdPrizePercentage = parseInt(thirdPrize);

    try {
        await lotteryContract.methods.setPrizePercentages(firstPrizePercentage, secondPrizePercentage, thirdPrizePercentage).send({ from: userAddress });
        alert('Prize percentages updated successfully!');
    } catch (error) {
        if (userAddress !== developerAddress.toLowerCase()) {
            alert('Only the admin can call this function');
        } else if (firstPrizePercentage <= 0 || secondPrizePercentage <= 0 || thirdPrizePercentage <= 0) {
            alert("Each prize percentage must be greater than 0");
        } else if (firstPrizePercentage <= secondPrizePercentage) {
            alert("First prize percentage must be greater than second prize");
        } else if (secondPrizePercentage <= thirdPrizePercentage) {
            alert("Second prize percentage must be greater than third prize");
        } else if (firstPrizePercentage + secondPrizePercentage + thirdPrizePercentage !== 100) {
            alert("Prize percentages must add up to 100%");
        } else {
            alert('Transaction failed');
        }
    }
}

// Set Draw Interval and Offsets
async function setDrawAndOffsets(newDrawInterval, newCancellationOffset, newSalesCloseOffset) {
    if (!(await validateAndLoadContractData())) return;

    const developerAddress = await lotteryContract.methods.developer().call();
    const drawInterval = parseInt(newDrawInterval);
    const cancellationOffset = parseInt(newCancellationOffset);
    const salesCloseOffset = parseInt(newSalesCloseOffset);

    try {
        await lotteryContract.methods.setDrawAndOffsets(drawInterval, cancellationOffset, salesCloseOffset).send({ from: userAddress });
        alert('Draw interval and offsets updated successfully!');
    } catch (error) {
        if (userAddress !== developerAddress.toLowerCase()) {
            alert('Only the admin can call this function');
        } else if (cancellationOffset >= drawInterval) {
            alert("Cancellation deadline offset must be less than the draw interval");
        } else if (salesCloseOffset >= drawInterval) {
            alert("Sales close time offset must be less than the draw interval");
        } else if (cancellationOffset <= salesCloseOffset) {
            alert("Cancellation deadline offset must be greater than sales close time offset");
        } else {
            alert('Transaction failed');
        }
    }
}

// Execute Draw
async function executeDraw() {
    if (!(await validateAndLoadContractData())) return;

    const developerAddress = await lotteryContract.methods.developer().call();
    const nextDrawTime = await lotteryContract.methods.getNextDrawTime().call();
    const uniqueParticipantsCount = await lotteryContract.methods.uniqueParticipantsCount().call();

    try {
        await lotteryContract.methods.executeDraw().send({ from: userAddress });
        alert('Draw executed successfully!');
    } catch (error) {
        if (userAddress != developerAddress.toLowerCase()) {
            alert('Only the admin can call this function');
        } else if (Math.floor(Date.now() / 1000) < nextDrawTime) {
            alert("Draw cannot be executed yet");
        } else if (uniqueParticipantsCount < 3) {
            alert("Not enough participants to execute the draw");
        } else {
            alert('Transaction failed');
        }
    }
}

// Cancel Draw
async function cancelDraw() {
    if (!(await validateAndLoadContractData())) return;

    const developerAddress = await lotteryContract.methods.developer().call();
    const salesCloseTime = await lotteryContract.methods.salesCloseTime().call();
    const uniqueParticipantsCount = await lotteryContract.methods.uniqueParticipantsCount().call();

    try {
        await lotteryContract.methods.cancelDraw().send({ from: userAddress });
        alert('Draw cancelled successfully!');
    } catch (error) {
        if (userAddress != developerAddress.toLowerCase()) {
            alert('Only the admin can call this function');
        } else if (Math.floor(Date.now() / 1000) < salesCloseTime) {
            alert("Draw can only be cancelled after sales close");
        } else if (uniqueParticipantsCount >= 3) {
            alert("Cannot cancel draw: 3 or more participants");
        } else {
            alert('Transaction failed');
        }
    }
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
