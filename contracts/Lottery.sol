// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LotteryDApp {
    mapping(address => uint256[]) public userTickets; // Stores the list of tickets for each user
    mapping(uint256 => address[]) public ticketOwners; // Stores the owners for each ticket number
    mapping(address => bool) public hasParticipated; // Tracks if a user has participated in the current draw

    address public immutable developer; // Developer's address, immutable
    uint256 public ticketPrice = 1 ether; // Price per ticket
    uint256 public drawInterval = 10 minutes; // Interval between draws, default is 10 minutes, admin can change
    uint256 public lastDrawTime; // The time of the last draw (or cancellation time)
    uint256 public cancellationDeadlineOffset = 2 minutes; // Time before the draw when cancellations are allowed
    uint256 public salesCloseTimeOffset = 1 minutes; // Time before the draw when ticket sales close
    uint256 public cancellationDeadline; // Actual cancellation deadline for the current draw
    uint256 public salesCloseTime; // Actual sales close time for the current draw
    bool public drawExecuted = false; // Indicates if the draw has been executed

    address[] public participants; // Track participants who have purchased tickets

    uint256 public firstPrizeNumber;
    uint256 public secondPrizeNumber;
    uint256 public thirdPrizeNumber;

    event TicketPurchased(address indexed buyer, uint256 ticketNumber);
    event TicketCancelled(address indexed user, uint256 ticketNumber, uint256 refundAmount);
    event DrawExecuted(uint256 firstPrizeNumber, uint256 secondPrizeNumber, uint256 thirdPrizeNumber);

    constructor(uint256 _firstDrawTime) {
        developer = msg.sender;
        lastDrawTime = _firstDrawTime - drawInterval;
        _updateTimesForNextDraw();
    }

    modifier onlyAdmin() {
        require(msg.sender == developer, "Only the admin can call this function");
        _;
    }

    modifier canExecuteDraw() {
        require(block.timestamp >= lastDrawTime + drawInterval, "Draw cannot be executed yet.");
        require(participants.length >= 3, "Not enough participants to execute the draw");
        require(!drawExecuted, "Draw already executed for this round");
        _;
    }

    // Admin can change the draw interval, which will take effect on the next draw
    function setDrawInterval(uint256 _newInterval) external onlyAdmin {
        drawInterval = _newInterval;
    }

    // Admin can change the cancellation deadline offset for future draws
    function setCancellationDeadlineOffset(uint256 _cancellationOffset) external onlyAdmin {
        cancellationDeadlineOffset = _cancellationOffset;
    }

    // Admin can change the sales close time offset for future draws
    function setSalesCloseTimeOffset(uint256 _salesCloseOffset) external onlyAdmin {
        salesCloseTimeOffset = _salesCloseOffset;
    }

    // Function to buy a ticket
    function buyTicket(uint256 ticketNumber) external payable {
        require(block.timestamp < salesCloseTime, "Sales have closed for this draw");
        require(msg.value == ticketPrice, "Incorrect ticket price");
        require(userTickets[msg.sender].length < 5, "Ticket purchase limit reached");
        require(ticketNumber >= 0 && ticketNumber <= 9999, "Ticket number must be a 4-digit number");
        require(!_hasUserPurchasedTicket(msg.sender, ticketNumber), "You have already purchased this ticket number.");

        // Add the ticket to the user's tickets and ticketOwners
        userTickets[msg.sender].push(ticketNumber);
        ticketOwners[ticketNumber].push(msg.sender);

        // If this is the user's first ticket, increase the unique participant count
        if (!hasParticipated[msg.sender]) {
            hasParticipated[msg.sender] = true;
            participants.push(msg.sender);
        }

        emit TicketPurchased(msg.sender, ticketNumber);
    }

    // Function to cancel a purchased ticket
    function cancelTicket(uint256 ticketNumber) external {
        require(block.timestamp <= cancellationDeadline, "Cancellation period is over");
        require(_hasUserPurchasedTicket(msg.sender, ticketNumber), "You don't own this ticket");

        _removeUserTicket(msg.sender, ticketNumber);
        _removeTicketOwner(ticketNumber, msg.sender);

        // Adjust the unique participant count if the user has no more tickets
        if (userTickets[msg.sender].length == 0 && hasParticipated[msg.sender]) {
            hasParticipated[msg.sender] = false;
            _removeParticipant(msg.sender);
        }

        // Calculate the refund (90% refund, 10% to the developer)
        uint256 refundAmount = (ticketPrice * 90) / 100;
        uint256 developerFee = ticketPrice - refundAmount;

        // Transfer the refund to the user
        payable(msg.sender).transfer(refundAmount);

        // Send the 10% penalty to the developer
        payable(developer).transfer(developerFee);

        emit TicketCancelled(msg.sender, ticketNumber, refundAmount);
    }

    // Function to execute the lottery draw
    function executeDraw() external onlyAdmin canExecuteDraw {
        // Generate the winning numbers using block properties
        firstPrizeNumber = _generateRandomNumber(1);
        secondPrizeNumber = _generateRandomNumber(2);
        thirdPrizeNumber = _generateRandomNumber(3);

        // Set the draw as executed
        drawExecuted = true;

        // Emit event to record the draw results
        emit DrawExecuted(firstPrizeNumber, secondPrizeNumber, thirdPrizeNumber);

        lastDrawTime = block.timestamp; // Set lastDrawTime to current time
        _updateTimesForNextDraw(); // Schedule next draw
    }

    // Function to cancel the draw if fewer than 3 participants
    function cancelDraw() external onlyAdmin {
        require(block.timestamp >= salesCloseTime, "Draw can only be cancelled after sales close.");
        require(participants.length < 3, "Cannot cancel draw: 3 or more participants");
        require(!drawExecuted, "Draw has already been executed");

        if (participants.length > 0) {
            // Refund all participants and cancel the draw
            _refundAllParticipants();
        }

        lastDrawTime = block.timestamp; // Set lastDrawTime to cancellation time
        _updateTimesForNextDraw(); // Schedule next draw
    }

    // Helper function to update times for the next draw
    function _updateTimesForNextDraw() private {
        cancellationDeadline = lastDrawTime + drawInterval - cancellationDeadlineOffset;
        salesCloseTime = lastDrawTime + drawInterval - salesCloseTimeOffset;
        drawExecuted = false;
    }

    // Function to generate a random 4-digit number using block properties
    function _generateRandomNumber(uint256 seed) private view returns (uint256) {
        return uint256(uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender, participants.length, seed))) % 10000);
    }

    // Function to refund all participants if the draw is cancelled
    function _refundAllParticipants() private {
        // Loop through all participants and refund them
        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            uint256 refundAmount = ticketPrice * userTickets[participant].length;
            payable(participant).transfer(refundAmount); // Refund the user
        }

        delete participants; // Clear the participants array
    }

    // Helper function to check if a user has purchased a specific ticket number
    function _hasUserPurchasedTicket(address user, uint256 ticketNumber) private view returns (bool) {
        uint256[] memory tickets = userTickets[user];

        for (uint8 i = 0; i < tickets.length; i++) {
            if (tickets[i] == ticketNumber) {
                return true;
            }
        }
        return false;
    }

    // Helper function to remove a ticket from the user's ticket array
    function _removeUserTicket(address user, uint256 ticketNumber) private {
        uint256[] storage tickets = userTickets[user];
        uint256 length = tickets.length;

        for (uint256 i = 0; i < length; i++) {
            if (tickets[i] == ticketNumber) {
                tickets[i] = tickets[length - 1]; // Replace with last element
                tickets.pop(); // Remove the last element
                if (tickets.length == 0) {
                    delete userTickets[user];
                }
                break;
            }
        }
    }

    // Helper function to remove a user from the ticketOwners mapping for a specific ticket number
    function _removeTicketOwner(uint256 ticketNumber, address user) private {
        address[] storage owners = ticketOwners[ticketNumber];
        uint256 length = owners.length;

        for (uint256 i = 0; i < length; i++) {
            if (owners[i] == user) {
                owners[i] = owners[length - 1]; // Replace with last element
                owners.pop(); // Remove the last element
                if (owners.length == 0) {
                    delete ticketOwners[ticketNumber];
                }
                break;
            }
        }
    }

    // Helper function to remove a participant from the participants array
    function _removeParticipant(address participant) private {
        uint256 length = participants.length;

        for (uint256 i = 0; i < length; i++) {
            if (participants[i] == participant) {
                participants[i] = participants[length - 1]; // Replace with last element
                participants.pop(); // Remove the last element
                if (participants.length == 0) {
                    delete participants;
                }
                break;
            }
        }
    }
}
