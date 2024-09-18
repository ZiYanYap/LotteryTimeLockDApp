let web3;
let isWeb3Initialized = false;
let userAddress = ''; // Store the current user address globally

async function initWeb3() {
    if (typeof window.ethereum !== 'undefined' && !isWeb3Initialized) {
        web3 = new Web3(window.ethereum);
        await loadContractData();
        isWeb3Initialized = true; // Set to true once initialized
    } else if (isWeb3Initialized) {
        console.log('Web3 is already initialized.');
    } else {
        console.log('MetaMask is not installed.');
    }
}

async function loadContractData() {
    try {
        const response = await fetch('LotteryDApp.json');
        const contractData = await response.json();
        const contractABI = contractData.abi;
        const contractAddress = contractData.networks['5777'].address; // Replace '5777' with the correct network ID

        // Initialize the contract
        lotteryContract = new web3.eth.Contract(contractABI, contractAddress);

        // Initialize event listeners after loading the contract
        await initializeEventListeners();
    } catch (error) {
        console.error('Failed to load contract data:', error);
        alert('Error loading contract ABI or address.');
    }
}

async function connect() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            handleAccountsChanged(accounts); // Update the user interface with the connected account
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

async function handleAccountsChanged(accounts) {
    const cardContainer = document.querySelector('.card-container');

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
        userAddress = accounts[0]; // Update the global userAddress variable
        
        // Check if the account is the developer's and show the Admin tab
        await checkIfDeveloper(userAddress);

        localStorage.setItem('metaMaskConnected', 'true');
        cardContainer.innerHTML = `
            <div class="card text-center">
                <div class="fs-2">
                    <i class="bi bi-person-circle" style="font-size: 4rem;"></i>
                    <p>Connected: ${userAddress}</p> <!-- Dynamically show the connected address -->
                </div>
                <h4 class="fw-bold"><br> Purchase History</h4>
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th scope="col">Ticket Number</th>
                            <th scope="col">Action</th>
                            <th scope="col">Date & Time</th>
                        </tr>
                    </thead>
                    <tbody id="purchaseHistory">
                        <!-- Purchase history will be dynamically inserted here -->
                    </tbody>
                </table>
            </div>`;

        // Initialize event listeners after connecting
        initializeEventListeners();
    }
}

async function checkIfDeveloper(account) {
    try {
        const developerAddress = await lotteryContract.methods.developer().call();
        if (account.toLowerCase() === developerAddress.toLowerCase()) {
            document.getElementById('adminNavItem').style.display = 'block';  // Show Admin tab
        } else {
            document.getElementById('adminNavItem').style.display = 'none';   // Hide Admin tab
        }
    } catch (error) {
        console.error('Error checking if the account is the developer:', error);
    }
}

let eventListenersInitialized = false;

async function initializeEventListeners() {
    if (!lotteryContract) {
        console.error('Contract is not initialized.');
        return;
    }

    if (eventListenersInitialized) return;

    eventListenersInitialized = true;

    // Listen for TicketPurchased event
    lotteryContract.events.TicketPurchased({
        filter: { buyer: web3.eth.defaultAccount },
        fromBlock: 'latest'
    })
    .on('data', (event) => {
        console.log('TicketPurchased event:', event);
        updatePurchaseHistory(event.returnValues, 'Purchased');
    })
    .on('error', (error) => {
        console.error('Error listening to TicketPurchased event:', error);
    });

    // Listen for TicketCancelled event
    lotteryContract.events.TicketCancelled({
        filter: { user: web3.eth.defaultAccount },
        fromBlock: 'latest'
    })
    .on('data', (event) => {
        console.log('TicketCancelled event:', event);
        updatePurchaseHistory(event.returnValues, 'Cancelled');
    })
    .on('error', (error) => {
        console.error('Error listening to TicketCancelled event:', error);
    });
}

function updatePurchaseHistory(eventData, eventType) {
    const purchaseHistoryElement = document.getElementById('purchaseHistory');
    const newRow = document.createElement('tr');

    const rowContent = `
        <th scope="row">${eventData.ticketNumber}</th>
        <td>${eventType}</td>
        <td>${new Date().toLocaleString()}</td>
    `;

    newRow.innerHTML = rowContent;
    purchaseHistoryElement.appendChild(newRow);
}

async function checkMetaMaskConnection() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            await initWeb3();
            const accounts = await ethereum.request({ method: 'eth_accounts' });
            handleAccountsChanged(accounts); // Initialize with the current account
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

// Listen for MetaMask account changes and update the UI accordingly
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        console.log('Account changed:', accounts);
        handleAccountsChanged(accounts); // Update the UI on account change
    });
}
