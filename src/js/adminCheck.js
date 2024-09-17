let lotteryContract;
let userAddress;
let developerAddress;

if (typeof window.ethereum !== 'undefined') {
    var web3 = new Web3(window.ethereum);
} else {
    alert('Please install MetaMask or another Ethereum provider.');
}

// Load contract data and initialize contract instance
async function loadContractData() {
    if (lotteryContract) return; // If contract is already loaded, skip re-loading

    try {
        const response = await fetch('LotteryDApp.json');
        if (!response.ok) throw new Error('Failed to fetch LotteryDApp.json');

        const contractData = await response.json();
        const contractABI = contractData.abi;
        const networkId = await web3.eth.net.getId();
        const contractAddress = contractData.networks[networkId]?.address;

        if (!contractAddress) {
            throw new Error(`Contract address not found for network ID: ${networkId}`);
        }

        // Initialize contract
        lotteryContract = new web3.eth.Contract(contractABI, contractAddress);
        console.log('Contract loaded successfully:', lotteryContract);

        // Fetch developer address from the contract
        developerAddress = await lotteryContract.methods.developer().call();
        console.log('Developer Address:', developerAddress);
    } catch (error) {
        console.error('Failed to load contract data:', error);
        alert(`Error loading contract: ${error.message}. Please check the network or file configuration.`);
    }
}

// Get the user's Ethereum address from MetaMask
async function getUserAddress() {
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (!accounts || accounts.length === 0) {
            throw new Error('No MetaMask accounts found. Please connect MetaMask.');
        }

        userAddress = accounts[0];
        console.log('User Address:', userAddress);
    } catch (error) {
        console.error('Error retrieving user address:', error);
        alert('Error retrieving user address. Please make sure MetaMask is connected.');
    }
}

// Check if the current user is the admin (developer) and adjust the UI accordingly
async function checkAdminAccess() {
    try {
        // Load contract data and fetch user address if not already fetched
        await loadContractData();
        await getUserAddress();

        // Compare user address to the developer address
        if (userAddress && userAddress.toLowerCase() === developerAddress.toLowerCase()) {
            document.getElementById('adminNavItem').style.display = 'block'; // Show admin navigation
        }
    } catch (error) {
        console.error('Failed to check admin access:', error);
    }
}

// Expose the function globally for use in the DOM
window.checkAdminAccess = checkAdminAccess;
