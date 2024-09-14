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

// Function to handle the connected accounts and update the UI layout
function handleAccountsChanged(accounts) {
    const cardContainer = document.querySelector('.card-container');

    if (accounts.length === 0) {
        // Display the connection button if no accounts are connected
        cardContainer.innerHTML = `<div class="card text-center">
            <h3 class="fw-bold fs-1">Connect to MetaMask</h3>
            <p class="fs-3">Connect your MetaMask wallet to interact with WinChain Lottery</p>
            <button id="connectButton" onclick="connect()" class="connect-button fs-4">Connect MetaMask</button>
            <p id="data" class="wallet-status fs-5">Not connected</p>
        </div>`;
    } else {
        // Update the content to show the user icon, connected wallet, purchase history, and change wallet button
        cardContainer.innerHTML = `
            <div class="card text-center">
                <div class="fs-2">
                    <i class="bi bi-person-circle" style="font-size: 4rem;"></i>
                    <p>Connected: ${accounts[0]}</p>
                </div>
                <h4 class="fw-bold"><br> Purchase History</h4>
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th scope="col">#</th>
                            <th scope="col">Product</th>
                            <th scope="col">Amount</th>
                            <th scope="col">Date & Time</th>
                        </tr>
                    </thead>
                    <tbody id="purchaseHistory">
                        <!-- Example placeholder rows with date and time -->
                        <tr>
                            <th scope="row">1</th>
                            <td>Lottery Ticket #1</td>
                            <td>0.01 ETH</td>
                            <td>2024-09-12 14:35:21</td>
                        </tr>
                        <tr>
                            <th scope="row">2</th>
                            <td>Lottery Ticket #2</td>
                            <td>0.02 ETH</td>
                            <td>2024-09-15 09:12:45</td>
                        </tr>
                    </tbody>
                </table>
            </div>`;
    }
}

// Function to switch the wallet by requesting MetaMask to change accounts
function switchWallet() {
    ethereum.request({ method: 'eth_requestAccounts' })
        .then(handleAccountsChanged)
        .catch((error) => {
            console.error('Error switching wallet:', error);
        });
}
