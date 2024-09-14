async function connect() {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is available.');

        try {
            // Request account access
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            handleAccountsChanged(accounts);
        } catch (error) {
            if (error.code === 4001) {
                // EIP-1193 userRejectedRequest error
                console.log('Please connect to MetaMask.');
            } else {
                console.error('Error connecting to MetaMask:', error);
            }
        }

        // Handle account changes after connection
        ethereum.on('accountsChanged', handleAccountsChanged);
    } else {
        console.log('MetaMask is not installed. Please install MetaMask.');
    }
}

// Handle the connected accounts
function handleAccountsChanged(accounts) {
    const statusElement = document.getElementById('data');
    
    if (accounts.length === 0) {
        // MetaMask is locked or the user has not connected any accounts
        statusElement.textContent = 'Not connected';
    } else {
        // Update the status with the first connected account
        statusElement.textContent = `Connected: ${accounts[0]}`;
    }
}
