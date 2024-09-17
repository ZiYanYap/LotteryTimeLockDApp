// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LotteryDApp {
    // Mappings to store ticket and ownership information per drawId
    mapping(uint256 => mapping(address => uint256[])) public userTickets; // Stores the list of tickets per user per drawId
    mapping(uint256 => mapping(uint256 => address[])) public ticketOwners; // Stores the owners for each ticket number per drawId
    mapping(uint256 => address[]) public participants; // Each drawId has its own array of participants
    mapping(uint256 => mapping(address => uint256)) public participantIndex; // Tracks index of each participant per drawId

    // Configuration and constants
    address public immutable developer; // Developer's address, immutable
    uint256 public ticketPrice = 1 ether; // Price per ticket
    uint256 public drawInterval = 10 minutes; // Interval between draws, default is 10 minutes, admin can change
    uint256 public cancellationDeadlineOffset = 2 minutes; // Time before the draw when cancellations are allowed
    uint256 public salesCloseTimeOffset = 1 minutes; // Time before the draw when ticket sales close

    // Prize distribution percentages
    uint256 public developerFeePercentage = 5; // Developer receives 5% of the total prize pool
    uint256 public firstPrizePercentage = 50; // First prize gets 50% of the prize pool
    uint256 public secondPrizePercentage = 30; // Second prize gets 30%
    uint256 public thirdPrizePercentage = 20; // Third prize gets 20%

    // Winning ticket numbers for the current draw
    uint256 public firstPrizeNumber;
    uint256 public secondPrizeNumber;
    uint256 public thirdPrizeNumber;

    // Draw tracking and management
    uint256 public drawId; // Track the current draw ID
    uint256 public uniqueParticipantsCount; // Tracks the number of unique participants in a draw
    uint256 public lastDrawTime; // The time of the last draw (or cancellation time)
    uint256 public cancellationDeadline; // Actual cancellation deadline for the current draw
    uint256 public salesCloseTime; // Actual sales close time for the current draw

    // Events
    event TicketPurchased(address indexed buyer, uint256 ticketNumber, uint256 drawId);
    event TicketCancelled(address indexed user, uint256 ticketNumber, uint256 refundAmount, uint256 drawId);
    event DrawExecuted(uint256 firstPrizeNumber, uint256 secondPrizeNumber, uint256 thirdPrizeNumber, uint256 drawId);
    event PrizeTierDistributed(uint256 indexed drawId, uint256 prizeTier, uint256 totalPrizeAmount, uint256 winnerCount);

    constructor(uint256 _firstDrawTime) {
        require(_firstDrawTime >= block.timestamp + drawInterval, "First draw time must be in the future and greater than or equal to the draw interval");
        developer = msg.sender;
        lastDrawTime = _firstDrawTime - drawInterval; // Set the last draw time to one interval before the first draw
        _resetForNextDraw();
    }

    modifier onlyAdmin() {
        require(msg.sender == developer, "Only the admin can call this function");
        _;
    }

    modifier canExecuteDraw() {
        require(block.timestamp >= lastDrawTime + drawInterval, "Draw cannot be executed yet.");
        require(uniqueParticipantsCount >= 3, "Not enough participants to execute the draw");
        _;
    }

    // Admin can set draw interval, cancellation deadline offset, and sales close time offset together
    function setDrawAndOffsets(uint256 newDrawInterval, uint256 newCancellationOffset, uint256 newSalesCloseOffset) external onlyAdmin {
        require(newCancellationOffset < newDrawInterval, "Cancellation deadline offset must be less than the draw interval");
        require(newSalesCloseOffset < newDrawInterval, "Sales close time offset must be less than the draw interval");
        require(newCancellationOffset > newSalesCloseOffset, "Cancellation deadline offset must be greater than sales close time offset");

        drawInterval = newDrawInterval;
        cancellationDeadlineOffset = newCancellationOffset;
        salesCloseTimeOffset = newSalesCloseOffset;
    }

    // Admin function to adjust developer fee percentage
    function setDeveloperFeePercentage(uint256 newDeveloperFeePercentage) external onlyAdmin {
        require(newDeveloperFeePercentage <= 20, "Developer fee percentage must be <= 20%");
        developerFeePercentage = newDeveloperFeePercentage;
    }

    // Admin function to adjust prize percentages for 1st, 2nd, and 3rd prizes
    function setPrizePercentages(uint256 newFirstPrizePercentage, uint256 newSecondPrizePercentage, uint256 newThirdPrizePercentage) external onlyAdmin {
        require(newFirstPrizePercentage > 0 && newSecondPrizePercentage > 0 && newThirdPrizePercentage > 0, "Each prize percentage must be greater than 0");
        require(newFirstPrizePercentage > newSecondPrizePercentage, "First prize percentage must be greater than second prize");
        require(newSecondPrizePercentage > newThirdPrizePercentage, "Second prize percentage must be greater than third prize");
        require(newFirstPrizePercentage + newSecondPrizePercentage + newThirdPrizePercentage == 100, "Prize percentages must add up to 100%");

        firstPrizePercentage = newFirstPrizePercentage;
        secondPrizePercentage = newSecondPrizePercentage;
        thirdPrizePercentage = newThirdPrizePercentage;
    }

    // Function to buy a ticket
    function buyTicket(uint256 ticketNumber) external payable {
        require(block.timestamp < salesCloseTime, "Sales have closed for this draw");
        require(msg.value == ticketPrice, "Incorrect ticket price");
        require(userTickets[drawId][msg.sender].length < 5, "Ticket purchase limit reached");
        require(ticketNumber >= 0 && ticketNumber <= 9999, "Ticket number must be a 4-digit number");
        require(!_hasUserPurchasedTicket(msg.sender, ticketNumber), "You have already purchased this ticket number.");

        // Add the ticket to the user's tickets and ticketOwners
        userTickets[drawId][msg.sender].push(ticketNumber);
        ticketOwners[drawId][ticketNumber].push(msg.sender);

        // If this is the user's first ticket, increase the unique participant count
        if (userTickets[drawId][msg.sender].length == 1) {
            participants[drawId].push(msg.sender);
            participantIndex[drawId][msg.sender] = uniqueParticipantsCount;
            uniqueParticipantsCount++;
        }

        emit TicketPurchased(msg.sender, ticketNumber, drawId);
    }

    // Function to cancel a purchased ticket
    function cancelTicket(uint256 ticketNumber) external {
        require(block.timestamp < cancellationDeadline, "Cancellation period is over");
        require(_hasUserPurchasedTicket(msg.sender, ticketNumber), "You don't own this ticket");

        _removeUserTicket(msg.sender, ticketNumber);
        _removeTicketOwner(ticketNumber, msg.sender);

        // Remove the participant and adjust the unique participant count if the user has no more tickets
        if (userTickets[drawId][msg.sender].length == 0) {
            uint256 index = participantIndex[drawId][msg.sender]; // Get the participant's index
            if (uniqueParticipantsCount == 1) {
                // If there's only one participant, simply pop the array
                participants[drawId].pop(); // Remove the only participant
            } else {
                participants[drawId][index] = participants[drawId][uniqueParticipantsCount - 1]; // Replace with last element
                participantIndex[drawId][participants[drawId][index]] = index; // Update the index of the swapped participant
                participants[drawId].pop(); // Remove the last element
            }
            delete participantIndex[drawId][msg.sender]; // Remove from mapping
            uniqueParticipantsCount--;
        }

        // Calculate the refund (90% refund, 10% to the developer)
        uint256 refundAmount = (ticketPrice * 90) / 100;
        uint256 developerFee = ticketPrice - refundAmount;

        // Transfer the refund to the user
        payable(msg.sender).transfer(refundAmount);

        // Send the 10% penalty to the developer
        payable(developer).transfer(developerFee);

        emit TicketCancelled(msg.sender, ticketNumber, refundAmount, drawId);
    }

    // Function to execute the lottery draw
    function executeDraw() external onlyAdmin canExecuteDraw {
        // Generate the winning numbers using block properties
        firstPrizeNumber = _generateRandomNumber(1);
        secondPrizeNumber = _generateRandomNumber(2);
        thirdPrizeNumber = _generateRandomNumber(3);

        // Emit event to record the draw results
        emit DrawExecuted(firstPrizeNumber, secondPrizeNumber, thirdPrizeNumber, drawId);

        // Distribute prizes immediately after draw
        _distributePrizes();

        // Update the draw time for the next draw
        lastDrawTime = block.timestamp;
        _resetForNextDraw(); // Reset and schedule for next draw
    }

    // Function to cancel the draw if fewer than 3 participants
    function cancelDraw() external onlyAdmin {
        require(block.timestamp >= salesCloseTime, "Draw can only be cancelled after sales close.");
        require(uniqueParticipantsCount < 3, "Cannot cancel draw: 3 or more participants");

        if (uniqueParticipantsCount > 0) {
            // Refund all participants and cancel the draw
            _refundAllParticipants();
        }

        lastDrawTime = block.timestamp; // Set lastDrawTime to cancellation time
        _resetForNextDraw(); // Reset and schedule for next draw
    }

    // Helper function to update times for the next draw
    function _resetForNextDraw() private {
        cancellationDeadline = lastDrawTime + drawInterval - cancellationDeadlineOffset;
        salesCloseTime = lastDrawTime + drawInterval - salesCloseTimeOffset;
        uniqueParticipantsCount = 0;
        drawId++;
    }

    // Function to generate a random 4-digit number using block properties
    function _generateRandomNumber(uint256 seed) private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender, uniqueParticipantsCount, seed))) % 10000;
    }

    // Function to refund all participants if the draw is cancelled
    function _refundAllParticipants() private {
        // Loop through all participants and refund them
        for (uint256 i = 0; i < uniqueParticipantsCount; i++) {
            address participant = participants[drawId][i];
            uint256 refundAmount = ticketPrice * userTickets[drawId][participant].length;
            payable(participant).transfer(refundAmount); // Refund the user
        }
    }

    // Helper function to distribute prizes
    function _distributePrizes() private {
        // Calculate the amounts for each prize tier after developer fee
        uint256 contractBalance = address(this).balance;

        uint256 developerFee = (contractBalance * developerFeePercentage) / 100;
        uint256 prizePoolAfterFee = contractBalance - developerFee;

        uint256 firstPrizeAmount = (prizePoolAfterFee * firstPrizePercentage) / 100;
        uint256 secondPrizeAmount = (prizePoolAfterFee * secondPrizePercentage) / 100;
        uint256 thirdPrizeAmount = (prizePoolAfterFee * thirdPrizePercentage) / 100;

        // Transfer developer fee
        payable(developer).transfer(developerFee);

        // Distribute prizes
        _distributePrizeTier(firstPrizeNumber, firstPrizeAmount, 1);
        _distributePrizeTier(secondPrizeNumber, secondPrizeAmount, 2);
        _distributePrizeTier(thirdPrizeNumber, thirdPrizeAmount, 3);
    }

    // Helper function to check if there are winners for any of the three prize numbers
    function _hasWinners(uint256 prizeNumber1, uint256 prizeNumber2, uint256 prizeNumber3) private view returns (bool) {
        return (
            ticketOwners[drawId][prizeNumber1].length > 0 || 
            ticketOwners[drawId][prizeNumber2].length > 0 || 
            ticketOwners[drawId][prizeNumber3].length > 0
        );
    }

    // Helper function to distribute prizes to a prize tier
    function _distributePrizeTier(uint256 prizeNumber, uint256 prizeAmount, uint256 prizeTier) private {
        address[] memory winners = ticketOwners[drawId][prizeNumber];
        uint256 winnerCount = winners.length;

        if (winnerCount > 0) {
            uint256 prizePerWinner = prizeAmount / winnerCount;

            for (uint256 i = 0; i < winnerCount; i++) {
                payable(winners[i]).transfer(prizePerWinner);
            }
        }

        emit PrizeTierDistributed(drawId, prizeTier, prizeAmount, winnerCount);
    }

    // Helper function to check if a user has purchased a specific ticket number
    function _hasUserPurchasedTicket(address user, uint256 ticketNumber) private view returns (bool) {
        uint256[] memory tickets = userTickets[drawId][user];

        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i] == ticketNumber) {
                return true;
            }
        }
        return false;
    }

    // Helper function to remove a ticket from the user's ticket array
    function _removeUserTicket(address user, uint256 ticketNumber) private {
        uint256[] storage tickets = userTickets[drawId][user];
        uint256 length = tickets.length;

        for (uint256 i = 0; i < length; i++) {
            if (tickets[i] == ticketNumber) {
                tickets[i] = tickets[length - 1]; // Replace with last element
                tickets.pop(); // Remove the last element
                break;
            }
        }
    }

    // Helper function to remove a user from the ticketOwners mapping for a specific ticket number
    function _removeTicketOwner(uint256 ticketNumber, address user) private {
        address[] storage owners = ticketOwners[drawId][ticketNumber];
        uint256 length = owners.length;

        for (uint256 i = 0; i < length; i++) {
            if (owners[i] == user) {
                owners[i] = owners[length - 1]; // Replace with last element
                owners.pop(); // Remove the last element
                break;
            }
        }
    }

    // Helper function to get the number of tickets a user owns in a particular draw
    function getUserTicketCount(address _user) public view returns (uint256) {
        return userTickets[drawId][_user].length;
    }
}
