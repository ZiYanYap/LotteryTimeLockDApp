// Load contract data
async function loadContractData() {
    if (typeof lotteryContract !== 'undefined') return; // Avoid reloading if contract is already loaded

    try {
        // Fetch the ABI and contract address configuration (from a local JSON file or hardcode)
        const response = await fetch('LotteryDApp.json');  // Path to your ABI file
        const contractData = await response.json();

        const contractABI = contractData.abi;  // ABI from the JSON file
        const networkId = await web3.eth.net.getId();  // Get the network ID

        const contractAddress = contractData.networks[networkId]?.address;  // Get contract address for the current network
        if (!contractAddress) throw new Error(`Contract not deployed on the current network (ID: ${networkId})`);

        // Initialize the contract instance
        lotteryContract = new web3.eth.Contract(contractABI, contractAddress);
    } catch (error) {
        console.error('Error loading contract data:', error);
        alert('Failed to load contract. Please ensure you are connected to the correct network.');
    }
}

// Check if the user is the developer and toggle Admin tab visibility
async function checkAccountAndToggleAdmin() {
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) {
            console.log('No MetaMask account connected.');
            return;
        }

        userAddress = accounts[0].toLowerCase();
        const developerAddress = await lotteryContract.methods.developer().call();

        // Check if the user is the developer and toggle Admin tab
        if (userAddress === developerAddress.toLowerCase()) {
            document.getElementById('adminNavItem').style.display = 'block';  // Show Admin tab
        } else {
            document.getElementById('adminNavItem').style.display = 'none';   // Hide Admin tab
        }
    } catch (error) {
        console.error('Error checking account and toggling Admin tab:', error);
    }
}

// Handle account changes and toggle Admin tab visibility
async function handleAccountChange(accounts) {
    if (accounts.length === 0) {
        console.log('No MetaMask account connected.');
        document.getElementById('adminTab').style.display = 'none';  // Hide Admin tab
    } else {
        userAddress = accounts[0].toLowerCase();
        await checkAccountAndToggleAdmin();  // Check again after account change
    }
}

// Initialize on page load
window.addEventListener('load', async () => {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        await loadContractData();  // Ensure the contract is loaded

        // Check and toggle Admin tab based on account
        await checkAccountAndToggleAdmin();

        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountChange);
    } else {
        console.log('MetaMask not detected. Please install MetaMask to use this dApp.');
    }
});
