let lotteryContract;
let userAddress;
let developerAddress;

if (typeof window.ethereum !== 'undefined') {
    var web3 = new Web3(window.ethereum);
} else {
    alert('Please install MetaMask or another Ethereum provider.');
}

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

        developerAddress = await lotteryContract.methods.developer().call();
        console.log('Developer Address:', developerAddress);
    } catch (error) {
        console.error('Failed to load contract data:', error);
        alert('Error loading contract ABI or address. Please check the file or network configuration.');
    }
}

async function getUserAddress() {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    userAddress = accounts[0];
    console.log('User Address:', userAddress);
}

async function checkAdminAccess() {
    try {
        await loadContractData();
        await getUserAddress();

        if (userAddress.toLowerCase() === developerAddress.toLowerCase()) {
            document.getElementById('adminNavItem').style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to check admin access:', error);
    }
}

// Make sure the function is available globally
window.checkAdminAccess = checkAdminAccess;
