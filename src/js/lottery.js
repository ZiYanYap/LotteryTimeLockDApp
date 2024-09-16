let web3;
let lotteryContract;
let userAccount;

// Contract ABI and address
const contractABI = [
    // Replace with your contract's ABI
    {
        "constant": false,
        "inputs": [
            {
                "name": "ticketNumber",
                "type": "uint256"
            }
        ],
        "name": "buyTicket",
        "outputs": [],
        "payable": true,
        "stateMutability": "payable",
        "type": "function"
    }
];
const contractAddress = '0x212b819F70F751684aF5ECcd2FAa6d6A0cf200F0'; // Replace with your contract address

window.addEventListener('load', async () => {
    // Check if MetaMask is installed
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        document.getElementById('connectButton').addEventListener('click', connectMetaMask);
        document.getElementById('buyTicketButton').addEventListener('click', buyTicket);

        // Initialize the contract
        lotteryContract = new web3.eth.Contract(contractABI, contractAddress);
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
    const ticketNumber = document.getElementById('ticketNumber').value;

    if (!ticketNumber) {
        alert('Please enter a ticket number.');
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
