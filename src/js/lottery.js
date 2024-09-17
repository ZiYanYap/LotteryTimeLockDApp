// Function to load contract data dynamically
async function loadContractData() {
    try {
        const response = await fetch('LotteryDApp.json');
        const contractData = await response.json();
        const contractABI = contractData.abi;
        const contractAddress = contractData.networks['5777'].address; // Replace '5777' with the correct network ID

        // Initialize the contract
        lotteryContract = new web3.eth.Contract(contractABI, contractAddress);
        console.log('Contract loaded:', lotteryContract);

        // Fetch and update total participants, total pool, and draw info
        updateTotalParticipants();
        updateTotalPool();
        updateDrawInfo();
    } catch (error) {
        console.error('Failed to load contract data:', error);
        alert('Error loading contract ABI or address.');
    }
}

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

        // Check MetaMask connection
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
            document.getElementById('connectPrompt').style.display = 'block';
            document.getElementById('ticketSection').style.display = 'none';
        } else {
            userAccount = accounts[0];
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

    if (!ticketNumber) return;

    if (!userAccount) {
        alert('Please connect your MetaMask account first.');
        return;
    }

    try {
        await lotteryContract.methods.buyTicket(ticketNumber).call({ from: userAccount });

        try {
            const ticketPrice = await lotteryContract.methods.ticketPrice().call();
            await lotteryContract.methods.buyTicket(ticketNumber).send({
                from: userAccount,
                value: ticketPrice
            });

            alert('Ticket purchased successfully!');
        } catch (sendError) {
            alert(`Transaction failed during send: ${sendError.message}`);
        }
    } catch (error) {
        let errorMessage = error.data.message.split(" revert ")[1];
        alert(`Error: ${errorMessage}`);
    }

    clearInputFields();
}

// Function to cancel a ticket
async function cancelTicket() {
    const ticketNumber = getTicketNumber();

    if (!ticketNumber) return;

    if (!userAccount) {
        alert('Please connect your MetaMask account first.');
        return;
    }

    try {
        await lotteryContract.methods.cancelTicket(ticketNumber).call({ from: userAccount });

        await lotteryContract.methods.cancelTicket(ticketNumber).send({ from: userAccount });

        alert('Ticket canceled successfully!');
    } catch (error) {
        let errorMessage = error.data.message.split(" revert ")[1];
        alert(`Error: ${errorMessage}`);
    }

    clearInputFields();
}

// Function to clear all input fields
function clearInputFields() {
    const inputs = document.querySelectorAll('.ticket-digit');
    inputs.forEach(input => {
        input.value = '';
    });
}

// Helper function to retrieve the ticket number from the input fields
function getTicketNumber() {
    const digit1 = document.getElementById('digit1').value;
    const digit2 = document.getElementById('digit2').value;
    const digit3 = document.getElementById('digit3').value;
    const digit4 = document.getElementById('digit4').value;

    if (isNaN(digit1) || isNaN(digit2) || isNaN(digit3) || isNaN(digit4)) {
        alert('Please enter only numeric digits.');
        return null;
    }

    const ticketNumber = parseInt(`${digit1}${digit2}${digit3}${digit4}`, 10);

    if (!ticketNumber || ticketNumber.toString().length !== 4) {
        alert('Please enter a valid 4-digit ticket number.');
        return null;
    }

    return ticketNumber;
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

// Update draw info periodically
setInterval(updateDrawInfo, 1000); // Update countdown every second

// Optionally, you can also periodically update the total pool and participants
setInterval(updateTotalPool, 60000); // Update every minute (adjust as needed)
setInterval(updateTotalParticipants, 60000); // Update every minute (adjust as needed)
