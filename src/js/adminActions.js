// Load contract data
async function loadContractData() {
    try {
        const response = await fetch('LotteryDApp.json');
        const contractData = await response.json();
        const contractABI = contractData.abi;
        const networkId = await web3.eth.net.getId();
        const contractAddress = contractData.networks[networkId]?.address;

        if (!contractAddress) {
            throw new Error('Contract address not found for network ID: ' + networkId);
        }

        lotteryContract = new web3.eth.Contract(contractABI, contractAddress);
        console.log('Contract loaded successfully:', lotteryContract);

        // Fetch user address
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];
        console.log('User Address:', userAddress);
    } catch (error) {
        console.error('Failed to load contract data:', error);
        alert('Error loading contract ABI or address. Please check the file or network configuration.');
    }
}

// Set Developer Fee Percentage
async function setDeveloperFeePercentage(newFeePercentage) {
    try {
        await loadContractData();

        if (!userAddress) {
            alert('Please connect your MetaMask account first.');
            return;
        }

        const feePercentage = parseInt(newFeePercentage, 10);

        if (feePercentage < 0 || feePercentage > 20) {
            alert('Fee percentage must be between 0 and 20.');
            return;
        }

        try {
            await lotteryContract.methods.setDeveloperFeePercentage(feePercentage).call({ from: userAddress });
        } catch (error) {
            let errorMessage = error.data.message.split(" revert ")[1];
            alert(`Error: ${errorMessage ? errorMessage : error.message}`);
            return;
        }

        try {
            await lotteryContract.methods.setDeveloperFeePercentage(feePercentage).send({ from: userAddress });
            alert('Developer fee percentage updated successfully!');
        } catch (sendError) {
            alert(`Transaction failed during send: ${sendError.message}`);
        }
    } catch (error) {
        alert(`An error occurred: ${error.message}`);
    }
}

// Set Prize Percentages
async function setPrizePercentages(firstPrize, secondPrize, thirdPrize) {
    try {
        await loadContractData();

        if (!userAddress) {
            alert('Please connect your MetaMask account first.');
            return;
        }

        const firstPrizePercentage = parseInt(firstPrize, 10);
        const secondPrizePercentage = parseInt(secondPrize, 10);
        const thirdPrizePercentage = parseInt(thirdPrize, 10);

        if (firstPrizePercentage <= 0 || secondPrizePercentage <= 0 || thirdPrizePercentage <= 0) {
            alert('Each prize percentage must be greater than 0.');
            return;
        }
        if (firstPrizePercentage <= secondPrizePercentage) {
            alert('First prize percentage must be greater than second prize percentage.');
            return;
        }
        if (secondPrizePercentage <= thirdPrizePercentage) {
            alert('Second prize percentage must be greater than third prize percentage.');
            return;
        }
        if (firstPrizePercentage + secondPrizePercentage + thirdPrizePercentage !== 100) {
            alert('Prize percentages must add up to 100%.');
            return;
        }

        try {
            await lotteryContract.methods.setPrizePercentages(firstPrizePercentage, secondPrizePercentage, thirdPrizePercentage).call({ from: userAddress });
        } catch (error) {
            let errorMessage = error.data.message.split(" revert ")[1];
            alert(`Error: ${errorMessage ? errorMessage : error.message}`);
            return;
        }

        try {
            await lotteryContract.methods.setPrizePercentages(firstPrizePercentage, secondPrizePercentage, thirdPrizePercentage).send({ from: userAddress });
            alert('Prize percentages updated successfully!');
        } catch (sendError) {
            alert(`Transaction failed during send: ${sendError.message}`);
        }
    } catch (error) {
        alert(`An error occurred: ${error.message}`);
    }
}

// Set Draw Interval and Offsets
async function setDrawAndOffsets(newDrawInterval, newCancellationOffset, newSalesCloseOffset) {
    try {
        await loadContractData();

        if (!userAddress) {
            alert('Please connect your MetaMask account first.');
            return;
        }

        const drawInterval = parseInt(newDrawInterval, 10);
        const cancellationOffset = parseInt(newCancellationOffset, 10);
        const salesCloseOffset = parseInt(newSalesCloseOffset, 10);

        if (cancellationOffset >= drawInterval) {
            alert('Cancellation offset must be less than the draw interval.');
            return;
        }
        if (salesCloseOffset >= drawInterval) {
            alert('Sales close offset must be less than the draw interval.');
            return;
        }
        if (cancellationOffset <= salesCloseOffset) {
            alert('Cancellation offset must be greater than sales close offset.');
            return;
        }

        try {
            await lotteryContract.methods.setDrawAndOffsets(drawInterval, cancellationOffset, salesCloseOffset).call({ from: userAddress });
        } catch (error) {
            let errorMessage = error.data.message.split(" revert ")[1];
            alert(`Error: ${errorMessage ? errorMessage : error.message}`);
            return;
        }

        try {
            await lotteryContract.methods.setDrawAndOffsets(drawInterval, cancellationOffset, salesCloseOffset).send({ from: userAddress });
            alert('Draw interval and offsets updated successfully!');
        } catch (sendError) {
            alert(`Transaction failed during send: ${sendError.message}`);
        }
    } catch (error) {
        alert(`An error occurred: ${error.message}`);
    }
}

// Execute Draw
async function executeDraw() {
    try {
        await loadContractData();

        if (!userAddress) {
            alert('Please connect your MetaMask account first.');
            return;
        }

        try {
            await lotteryContract.methods.executeDraw().call({ from: userAddress });
        } catch (error) {
            let errorMessage = error.data.message.split(" revert ")[1];
            alert(`Error: ${errorMessage ? errorMessage : error.message}`);
            return;
        }

        try {
            await lotteryContract.methods.executeDraw().send({ from: userAddress });
            alert('Draw executed successfully!');
        } catch (sendError) {
            alert(`Transaction failed during send: ${sendError.message}`);
        }
    } catch (error) {
        alert(`An error occurred: ${error.message}`);
    }
}

// Cancel Draw
async function cancelDraw() {
    try {
        await loadContractData();

        if (!userAddress) {
            alert('Please connect your MetaMask account first.');
            return;
        }

        try {
            await lotteryContract.methods.cancelDraw().call({ from: userAddress });
        } catch (error) {
            let errorMessage = error.data.message.split(" revert ")[1];
            alert(`Error: ${errorMessage ? errorMessage : error.message}`);
            return;
        }

        try {
            await lotteryContract.methods.cancelDraw().send({ from: userAddress });
            alert('Draw cancelled successfully!');
        } catch (sendError) {
            alert(`Transaction failed during send: ${sendError.message}`);
        }
    } catch (error) {
        alert(`An error occurred: ${error.message}`);
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

// Event listener for the Execute Draw button
document.getElementById('executeDrawBtn').addEventListener('click', function () {
    executeDraw();
});

// Event listener for the Cancel Draw button
document.getElementById('cancelDrawBtn').addEventListener('click', function () {
    cancelDraw();
});
