document.addEventListener('DOMContentLoaded', () => {
    // Start loading contract data and setting up event listeners
    loadContractData();
});

// Function to start listening to events
function listenToEvents() {
    if (!lotteryContract) {
        console.error('lotteryContract is not initialized.');
        return;
    }

    // Listen for the DrawExecuted event
    lotteryContract.events.DrawExecuted({
        fromBlock: 'latest'
    })
    .on('data', event => {
        const { firstPrizeNumber, secondPrizeNumber, thirdPrizeNumber, drawId } = event.returnValues;
        logDrawExecutedEvent(firstPrizeNumber, secondPrizeNumber, thirdPrizeNumber, drawId);
    })
    .on('error', error => {
        console.error('Error listening to DrawExecuted events:', error);
    });

    // Listen for the PrizeTierDistributed event
    lotteryContract.events.PrizeTierDistributed({
        fromBlock: 'latest'
    })
    .on('data', event => {
        const { drawId, prizeTier, totalPrizeAmount, winnerCount } = event.returnValues;
        logPrizeTierDistributedEvent(drawId, prizeTier, totalPrizeAmount, winnerCount);
    })
    .on('error', error => {
        console.error('Error listening to PrizeTierDistributed events:', error);
    });
}

// Function to log DrawExecuted events to the HTML
function logDrawExecutedEvent(firstPrize, secondPrize, thirdPrize, drawId) {
    const eventList = document.getElementById('drawExecutedList');
    const existingItems = eventList.getElementsByTagName('li');

    // Check for duplicates
    for (const item of existingItems) {
        if (item.innerHTML.includes(`Draw ID: ${drawId}`)) {
            return; // Event already exists, do nothing
        }
    }

    const eventItem = document.createElement('li');
    eventItem.innerHTML = `
        <strong>Draw ID:</strong> ${drawId} | 
        <strong>1st Prize:</strong> ${firstPrize} | 
        <strong>2nd Prize:</strong> ${secondPrize} | 
        <strong>3rd Prize:</strong> ${thirdPrize}
    `;
    eventList.appendChild(eventItem);
}

// Function to log PrizeTierDistributed events to the HTML
function logPrizeTierDistributedEvent(drawId, prizeTier, totalPrizeAmount, winnerCount) {
    const eventList = document.getElementById('prizeTierList');
    const existingItems = eventList.getElementsByTagName('li');

    // Check for duplicates
    for (const item of existingItems) {
        if (item.innerHTML.includes(`Draw ID: ${drawId}`) && item.innerHTML.includes(`Prize Tier: ${prizeTier}`)) {
            return; // Event already exists, do nothing
        }
    }

    const eventItem = document.createElement('li');
    const totalPrizeEther = web3.utils.fromWei(totalPrizeAmount, 'ether'); // Convert to ether

    eventItem.innerHTML = `
        <strong>Draw ID:</strong> ${drawId} | 
        <strong>Prize Tier:</strong> ${prizeTier} | 
        <strong>Total Prize:</strong> ${totalPrizeEther} ETH | 
        <strong>Winners:</strong> ${winnerCount}
    `;
    eventList.appendChild(eventItem);
}
