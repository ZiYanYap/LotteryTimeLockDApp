let web3;
let isWeb3Initialized = false;
let userAddress = ''; // Store the current user address globally
let lotteryContract;
let eventListenersInitialized = false;

async function initWeb3() {
    if (!isWeb3Initialized && typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        await loadContractData();
        isWeb3Initialized = true; // Set to true once initialized
    } else if (!window.ethereum) {
        console.log('MetaMask is not installed.');
    }
}

async function loadContractData() {
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

async function connect() {
    if (!window.ethereum) {
        console.log('MetaMask is not installed. Please install MetaMask.');
        return;
    }

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
                <i class="bi bi-person-circle" style="font-size: 7rem;"></i>
                <h3 class="fw-bold fs-1">Connected to MetaMask</h3>
                <p class="fs-3">Connected Address: <span id="connectedAddress">${userAddress}</span></p>
                <h3 class="fw-bold fs-1"><br>Purchase History</h3>
                <table class="table table-striped table-bordered table-hover table-responsive-md">
                    <thead class="table-dark">
                        <tr>
                            <th scope="col" style="font-size: 2em">Draw ID</th>
                            <th scope="col" style="font-size: 2em">Ticket Number</th>
                            <th scope="col" style="font-size: 2em">Action</th>
                        </tr>
                    </thead>
                    <tbody id="purchaseHistory" style="font-size: 1.5em">
                        <!-- Purchase history will be dynamically inserted here -->
                    </tbody>
                </table>
            </div>`;

        fetchDrawEvents();
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

function updatePurchaseHistory(eventData, eventType) {
    const purchaseHistoryElement = document.getElementById('purchaseHistory');
    const newRow = document.createElement('tr');

    // Ensure the ticket number has exactly 4 digits, padding with zeros if necessary
    const formattedTicketNumber = eventData.ticketNumber.toString().padStart(4, '0');

    const rowContent = `
        <th scope="row">${eventData.drawId}</th>
        <td>${formattedTicketNumber}</td>
        <td>${eventType}</td>
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

async function fetchDrawEvents() {
    try {
        // Fetch past TicketPurchased events
        let pastPurchasedEvents = await lotteryContract.getPastEvents('TicketPurchased', {
            filter: { buyer: userAddress },
            fromBlock: 0,
            toBlock: 'latest'
        });

        // Fetch past TicketCancelled events
        let pastCancelledEvents = await lotteryContract.getPastEvents('TicketCancelled', {
            filter: { user: userAddress },
            fromBlock: 0,
            toBlock: 'latest'
        });

        // Combine both purchased and cancelled tickets
        const allEvents = [...pastPurchasedEvents, ...pastCancelledEvents].sort((a, b) => b.blockNumber - a.blockNumber);

        // Clear the purchase history table
        document.getElementById('purchaseHistory').innerHTML = '';

        // Display events
        allEvents.forEach(event => {
            const eventType = event.event === 'TicketPurchased' ? 'Purchased' : 'Cancelled';
            updatePurchaseHistory(event.returnValues, eventType);
        });
    } catch (error) {
        console.error('Error fetching draw events:', error);
    }
}

window.onload = checkMetaMaskConnection;

// Listen for MetaMask account changes and update the UI accordingly
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        handleAccountsChanged(accounts); // Update the UI on account change
    });
}
