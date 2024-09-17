// Fetch ABI and Contract Address dynamically from LotteryDApp.json
async function loadContractData() {
    try {
        const response = await fetch('LotteryDApp.json');
        const contractData = await response.json();
        const contractABI = contractData.abi;
        const contractAddress = contractData.networks['5777'].address; // Replace '5777' with the correct network ID

        // Initialize the contract
        lotteryContract = new web3.eth.Contract(contractABI, contractAddress);
        console.log('Contract loaded:', lotteryContract);
    } catch (error) {
        console.error('Failed to load contract data:', error);
        alert('Error loading contract ABI or address.');
    }
}

window.addEventListener('load', async () => {
    // Check if MetaMask is installed
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);

        // Load contract data (ABI and address) dynamically
        await loadContractData();

        // Check MetaMask connection
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
            // Show the prompt if not connected
            document.getElementById('connectPrompt').style.display = 'block';
            document.getElementById('ticketSection').style.display = 'none';
        } else {
            userAccount = accounts[0];
            // Show the ticket section if connected
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

async function buyTicket() {
    // Get the 4 digits from the input fields
    const ticketNumber = getTicketNumber();

    if (!ticketNumber) return;

    if (!userAccount) {
        alert('Please connect your MetaMask account first.');
        return;
    }

    try {
        // Use call() to check for any errors before msg.value check
        await lotteryContract.methods.buyTicket(ticketNumber).call({ from: userAccount });
        
    } catch (error) {
        let errorMessage = error.data.message.split(" revert ")[1];

        // Check if the error is due to incorrect ticket price
        if (errorMessage === "Incorrect ticket price") {
            try {
                // Fetch the current ticket price dynamically from the contract
                const ticketPrice = await lotteryContract.methods.ticketPrice().call();

                // Send the transaction with the correct Ether amount
                await lotteryContract.methods.buyTicket(ticketNumber).send({
                    from: userAccount,
                    value: ticketPrice
                });

                alert('Ticket purchased successfully!');
            } catch (sendError) {
                alert(`Transaction failed during send: ${sendError.message}`);
            }
        } else {
            // If it's a different error, display the error message
            alert(`Error: ${errorMessage}`);
        }
    }

    // Clear the input fields
    clearInputFields();
}

async function cancelTicket() {
    // Get the 4 digits from the input fields
    const ticketNumber = getTicketNumber();

    if (!ticketNumber) return;

    if (!userAccount) {
        alert('Please connect your MetaMask account first.');
        return;
    }

    try {
        // Use call() to check for any errors before sending the transaction
        await lotteryContract.methods.cancelTicket(ticketNumber).call({ from: userAccount });
        
        // If call() succeeds, proceed to send the transaction
        await lotteryContract.methods.cancelTicket(ticketNumber).send({ from: userAccount });
        
        alert('Ticket canceled successfully!');
    } catch (error) {
        let errorMessage = error.data.message.split(" revert ")[1];

        // Handle specific error messages, if known
        if (errorMessage === "Ticket does not exist" || errorMessage === "Ticket not owned by user") {
            alert(`Error: ${errorMessage}`);
        } else {
            // If it's a different error, display the error message
            alert(`Error: ${errorMessage}`);
        }
    }

    // Clear the input fields
    clearInputFields();
}

// Function to clear all input fields
function clearInputFields() {
    const inputs = document.querySelectorAll('.ticket-digit');
    inputs.forEach(input => {
        input.value = ''; // Clear each input field
    });
}

// Helper function to retrieve the ticket number from the input fields
function getTicketNumber() {
    const digit1 = document.getElementById('digit1').value;
    const digit2 = document.getElementById('digit2').value;
    const digit3 = document.getElementById('digit3').value;
    const digit4 = document.getElementById('digit4').value;

    // Validate that the inputs are all numbers
    if (isNaN(digit1) || isNaN(digit2) || isNaN(digit3) || isNaN(digit4)) {
        alert('Please enter only numeric digits.');
        return null;
    }

    // Convert to a uint256 number
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
                inputs[index + 1].focus(); // Move to next input
            }
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && input.value.length === 0 && index > 0) {
                inputs[index - 1].focus(); // Move to previous input on backspace
            }
        });
    });
}
