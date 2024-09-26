async function updateTotalParticipants() {
    try {
        const totalParticipants = await lotteryContract.methods.uniqueParticipantsCount().call();
        document.getElementById('totalParticipants').innerText = totalParticipants;
    } catch (error) {
        console.error('Error fetching total participants:', error);
        document.getElementById('totalParticipants').innerText = 'Error';
    }
}

async function updateTotalPool() {
    try {
        const totalPool = await lotteryContract.methods.getPrizePoolAfterFee().call();
        const totalPoolInEther = web3.utils.fromWei(totalPool, 'ether');
        document.getElementById('totalPool').innerText = `${totalPoolInEther} ETH`;
    } catch (error) {
        console.error('Error fetching total pool:', error);
        document.getElementById('totalPool').innerText = 'Error';
    }
}

// Function to update draw info (time until draw)
async function updateDrawInfo() {
    try {
        const drawId = await lotteryContract.methods.drawId().call(); // Fetch the draw ID from the contract
        document.getElementById('drawId').innerText = drawId;  // Update the draw ID in the UI

        // Fetch the next draw time from the contract
        const nextDrawTime = BigInt(await lotteryContract.methods.getNextDrawTime().call());
        const currentTime = BigInt(Math.floor(Date.now() / 1000)); // Convert current time to BigInt

        // Calculate remaining time
        const remainingTime = nextDrawTime - currentTime;

        // Check if the remaining time is positive
        if (remainingTime > BigInt(0)) {
            // Calculate hours, minutes, and seconds
            const hours = Number(remainingTime / BigInt(3600));
            const minutes = Number((remainingTime % BigInt(3600)) / BigInt(60));
            const seconds = Number(remainingTime % BigInt(60));

            // Update the HTML elements
            document.getElementById('hours').innerText = hours;
            document.getElementById('minutes').innerText = minutes;
            document.getElementById('seconds').innerText = seconds;
        } else {
            // Time is up or invalid, update accordingly
            document.getElementById('hours').innerText = '0';
            document.getElementById('minutes').innerText = '0';
            document.getElementById('seconds').innerText = '0';
        }
    } catch (error) {
        console.error('Error fetching draw info:', error);
        document.getElementById('hours').innerText = 'Error';
        document.getElementById('minutes').innerText = 'Error';
        document.getElementById('seconds').innerText = 'Error';
    }
}

// Initial load of data
window.addEventListener('load', async () => {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);

        // Load contract data (ABI and address) dynamically
        await loadContractData();
        await updateTotalParticipants();
        await updateTotalPool();
        await updateDrawInfo();

        // Check MetaMask connection
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
            document.getElementById('connectPrompt').style.display = 'block';
            document.getElementById('ticketSection').style.display = 'none';
        } else {
            document.getElementById('connectPrompt').style.display = 'none';
            document.getElementById('ticketSection').style.display = 'block';

            // Add event listeners to buttons
            document.getElementById('buyTicketButton').addEventListener('click', buyTicket);
            document.getElementById('cancelTicketButton').addEventListener('click', cancelTicket);

            // Add event listeners to automatically focus on the next input box
            addInputNavigation();
        }
    } else {
        alert('MetaMask not detected. Please install MetaMask to use this dApp.');
    }
});

// Function to buy a ticket
async function buyTicket() {
    const ticketNumber = getTicketNumber();
    if (ticketNumber === null) return;

    if (!userAddress) return alert('Please connect your MetaMask account first.');

    const salesCloseTime = await lotteryContract.methods.salesCloseTime().call();
    const userTicketCount = await lotteryContract.methods.getUserTicketCount(userAddress).call();
    const hasUserPurchasedTicket = await lotteryContract.methods.hasUserPurchasedTicket(userAddress, ticketNumber).call();
    const ticketPrice = await lotteryContract.methods.ticketPrice().call();
    
    // Check for validation before proceeding with the transaction
    if (Math.floor(Date.now() / 1000) >= salesCloseTime) {
        return alert("Sales have closed for this draw");
    } else if (userTicketCount >= 5) {
        return alert("Ticket purchase limit reached");
    } else if (hasUserPurchasedTicket) {
        return alert("You have already purchased this ticket number");
    }

    try {
        await lotteryContract.methods.buyTicket(ticketNumber).send({
            from: userAddress,
            value: ticketPrice
        });
        alert('Ticket purchased successfully!');
    } catch (error) {
        alert('Transaction failed');
    }

    clearInputFields();
}

// Function to cancel a ticket
async function cancelTicket() {
    const ticketNumber = getTicketNumber();
    if (ticketNumber === null) return;

    if (!userAddress) return alert('Please connect your MetaMask account first.');

    const cancellationDeadline = await lotteryContract.methods.cancellationDeadline().call();
    const hasUserPurchasedTicket = await lotteryContract.methods.hasUserPurchasedTicket(userAddress, ticketNumber).call();

    // Check for validation before proceeding with the cancellation
    if (Math.floor(Date.now() / 1000) >= cancellationDeadline) {
        return alert("Cancellation period is over");
    } else if (!hasUserPurchasedTicket) {
        return alert("You don't own this ticket");
    }

    try {
        await lotteryContract.methods.cancelTicket(ticketNumber).send({ from: userAddress });
        alert('Ticket canceled successfully!');
    } catch (error) {
        alert('Transaction failed');
    }

    clearInputFields();
}

// Helper function to clear input fields
function clearInputFields() {
    document.querySelectorAll('.ticket-digit').forEach(input => input.value = '');
}

// Helper function to retrieve the ticket number
function getTicketNumber() {
    // Get the values of the four digits and store them in an array
    const digits = ['digit1', 'digit2', 'digit3', 'digit4'].map(id => document.getElementById(id).value.trim());

    // Ensure all inputs are numeric and not empty
    if (digits.some(digit => digit === '' || isNaN(digit))) {
        alert('Please enter only numeric digits (0-9) in all fields.');
        clearInputFields();
        return null;
    }

    // Convert the array of digit strings to a single ticket number
    const ticketNumber = parseInt(digits.join(''));

    // Ensure that the ticket number is a valid 4-digit number
    if (ticketNumber.toString().length <= 4) {
        return ticketNumber;
    } else {
        alert('Ticket number must be 4 digits or less.');
        return null;
    }
}


// Function to auto-move focus to the next input box
function addInputNavigation() {
    const inputs = document.querySelectorAll('.ticket-digit');
    inputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            if (input.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && input.value.length === 0 && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });
}

// Update draw info every 1 second, total pool and total participants every 5 seconds
setInterval(updateDrawInfo, 1000);
setInterval(updateTotalPool, 5000);
setInterval(updateTotalParticipants, 5000);