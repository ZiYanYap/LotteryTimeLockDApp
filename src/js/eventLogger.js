window.onload = async () => {
    if (window.ethereum) {
        try {
            web3 = new Web3(window.ethereum);
            await loadContractData();  // Make sure contract is loaded first
            await fetchAllAndListenToEvents();  // Now you can safely listen to events
        } catch (error) {
            console.error('Error initializing Web3 or loading contract:', error);
            alert('Failed to connect to MetaMask or load contract. Please try again.');
        }
    } else {
        alert('MetaMask is not installed. Please install MetaMask to use this dApp.');
    }
};

// Function to fetch all past events and start listening to new events
async function fetchAllAndListenToEvents() {
    if (!lotteryContract) await loadContractData();

    // Fetch past DrawExecuted events
    const drawExecutedEvents = await lotteryContract.getPastEvents('DrawExecuted', {
        fromBlock: 0,
        toBlock: 'latest'
    });
    drawExecutedEvents.forEach(event => {
        const { firstPrizeNumber, secondPrizeNumber, thirdPrizeNumber, drawId } = event.returnValues;
        logDrawExecutedEvent(firstPrizeNumber, secondPrizeNumber, thirdPrizeNumber, drawId);
    });

    // Fetch past PrizeTierDistributed events
    const prizeTierEvents = await lotteryContract.getPastEvents('PrizeTierDistributed', {
        fromBlock: 0,
        toBlock: 'latest'
    });
    prizeTierEvents.forEach(event => {
        const { drawId, prizeTier, totalPrizeAmount, winnerCount } = event.returnValues;
        logPrizeTierDistributedEvent(drawId, prizeTier, totalPrizeAmount, winnerCount);
    });
}

// Function to log DrawExecuted events to the HTML
function logDrawExecutedEvent(firstPrize, secondPrize, thirdPrize, drawId) {
    const eventList = document.getElementById('drawExecutedList');
    const eventItem = document.createElement('div');

    eventItem.innerHTML = `
        <div class="event-card">
            <div class="event-header">
                <h5>Draw ID: ${drawId}</h5>
            </div>
            <div class="event-body">
                <p><strong>1st Prize:</strong> ${firstPrize.toString().padStart(4, '0')}</p>
                <p><strong>2nd Prize:</strong> ${secondPrize.toString().padStart(4, '0')}</p>
                <p><strong>3rd Prize:</strong> ${thirdPrize.toString().padStart(4, '0')}</p>
            </div>
        </div>
    `;
    eventList.appendChild(eventItem);
}

// Function to log PrizeTierDistributed events to the HTML
function logPrizeTierDistributedEvent(drawId, prizeTier, totalPrizeAmount, winnerCount) {
    const eventList = document.getElementById('prizeTierList');
    const eventItem = document.createElement('div');
    const totalPrizeEther = web3.utils.fromWei(totalPrizeAmount, 'ether'); // Convert to ether

    eventItem.innerHTML = `
        <div class="event-header">
            <h5>Draw ID: ${drawId} | Prize Tier: ${prizeTier}</h5>
        </div>
        <div class="event-body">
            <p><strong>Total Prize:</strong> ${totalPrizeEther} ETH</p>
            <p><strong>Winners:</strong> ${winnerCount}</p>
        </div>
    `;
    eventList.appendChild(eventItem);
}
