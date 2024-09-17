let web3;
let lotteryContract;
let userAccount;

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
        document.getElementById('connectButton').addEventListener('click', connectMetaMask);
        document.getElementById('buyTicketButton').addEventListener('click', buyTicket);

        // Load contract data (ABI and address) dynamically
        await loadContractData();

        // Add event listeners to automatically focus on the next input box
        addInputNavigation();
    } else {
        alert('MetaMask not detected. Please install MetaMask to use this dApp.');
    }
});

async function connectMetaMask() {
    try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];
        document.getElementById('status').innerText = `Connected: ${userAccount}`;
    } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        document.getElementById('status').innerText = 'Failed to connect to MetaMask.';
    }
}

async function buyTicket() {
    // Get the 4 digits from the input fields
    const digit1 = document.getElementById('digit1').value;
    const digit2 = document.getElementById('digit2').value;
    const digit3 = document.getElementById('digit3').value;
    const digit4 = document.getElementById('digit4').value;

    const ticketNumber = `${digit1}${digit2}${digit3}${digit4}`;

    if (!digit1 || !digit2 || !digit3 || !digit4) {
        alert('Please enter a 4-digit ticket number.');
        return;
    }

    if (!userAccount) {
        alert('Please connect your MetaMask account first.');
        return;
    }

    try {
        // Buying ticket
        await lotteryContract.methods.buyTicket(ticketNumber).send({
            from: userAccount,
            value: web3.utils.toWei('1', 'ether') // Adjust ticket price as necessary
        });
        alert('Ticket purchased successfully!');
    } catch (error) {
        console.error('Error buying ticket:', error);
        alert('An error occurred while purchasing the ticket.');
    }
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
