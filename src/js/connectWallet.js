async function connect() {
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is available.');

        try {
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            handleAccountsChanged(accounts);
        } catch (error) {
            if (error.code === 4001) {
                console.log('Please connect to MetaMask.');
            } else {
                console.error('Error connecting to MetaMask:', error);
            }
        }
    } else {
        console.log('MetaMask is not installed. Please install MetaMask.');
    }
}

function handleAccountsChanged(accounts) {
    const cardContainer = document.querySelector('.card-container');
    const dataElement = document.getElementById('data');

    if (accounts.length === 0) {
        localStorage.setItem('metaMaskConnected', 'false');
        cardContainer.innerHTML = `
            <div class="card text-center">
                <h3 class="fw-bold fs-1">Connect to MetaMask</h3>
                <p class="fs-3">Connect your MetaMask wallet to interact with WinChain Lottery</p>
                <button id="connectButton" onclick="connect()" class="connect-button fs-4">Connect MetaMask</button>
                <p id="data" class="wallet-status fs-5">Not connected</p>
            </div>`;
    } else {
        localStorage.setItem('metaMaskConnected', 'true');
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

async function checkMetaMaskConnection() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await ethereum.request({ method: 'eth_accounts' });
            handleAccountsChanged(accounts);
        } catch (error) {
            console.error('Error checking MetaMask connection:', error);
        }
    } else {
        localStorage.setItem('metaMaskConnected', 'false');
        document.getElementById('data').innerHTML = `
            <div class="info-message">
                MetaMask is not installed. Please <a href="account.html">install MetaMask and connect your wallet</a>.
            </div>`;
    }
}

window.onload = checkMetaMaskConnection;
