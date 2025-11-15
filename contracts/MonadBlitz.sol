// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * @title MonadBlitz
 * @dev On-chain racing game with Chainlink Price Feed integration
 * @dev Supports Chainlink Automation for automatic position updates
 */
contract MonadBlitz is AutomationCompatibleInterface {
    // ============ Constants ============
    uint256 public constant ROUND_DURATION = 90 seconds;
    uint256 public constant BETTING_PHASE_END = 35 seconds;
    uint256 public constant RACING_PHASE_START = 40 seconds;
    uint256 public constant RACING_PHASE_END = 80 seconds;
    
    uint256 public constant START_POS = 3000;
    uint256 public constant FINISH_POS = 10000;
    
    uint256 public constant MIN_BET_AMOUNT = 0.001 ether; // TODO: 튜닝 가능
    uint256 public constant MAX_BET_AMOUNT = 10 ether; // TODO: 튜닝 가능
    
    // SPEED_FORMULA_TODO: 속도 결정식 상수들 - 튜닝 가능하게 분리
    int256 public constant BASE_SPEED = 50; // 기본 속도 (units per second) - 절반으로 감소
    int256 public constant SPEED_MULTIPLIER = 50000; // 가격 변화율에 대한 속도 배수
    
    // ============ Enums ============
    enum Phase { Betting, Racing, Settlement, Finished }
    enum Horse { BTC, SOL, DOGE, PEPE }
    
    // ============ Structs ============
    struct Round {
        uint256 startTime;
        uint256 lastUpdateTime; // 마지막 위치 업데이트 시간 (초 단위)
        Phase phase;
        uint8 winner; // 0: BTC, 1: ETH, 2: MONAD, 3: DOGE
        bool settled;
        mapping(uint8 => uint256) totalBets; // horseId => total bet amount
        mapping(uint8 => uint256) positions; // horseId => current position
        mapping(uint8 => int256) lastPrices; // horseId => last price (scaled)
    }
    
    struct Bet {
        address bettor;
        uint8 horseId;
        uint256 amount;
        bool claimed;
    }
    
    // ============ State Variables ============
    uint256 public currentRoundId;
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => Bet[])) public bets; // roundId => bettor => bets
    mapping(uint256 => mapping(address => uint256)) public winnings; // roundId => bettor => winnings
    
    // Chainlink Price Feed addresses (TODO: Monad 네트워크에 맞게 설정)
    mapping(uint8 => AggregatorV3Interface) public priceFeeds;
    
    // ============ Events ============
    event RoundStarted(uint256 indexed roundId, uint256 startTime);
    event BetPlaced(uint256 indexed roundId, address indexed bettor, uint8 horseId, uint256 amount);
    event PositionUpdated(uint256 indexed roundId, uint8 horseId, uint256 position);
    event RoundSettled(uint256 indexed roundId, uint8 winner);
    event WinningsClaimed(uint256 indexed roundId, address indexed bettor, uint256 amount);
    
    // ============ Constructor ============
    constructor(
        address _btcFeed,
        address _solFeed,
        address _dogeFeed,
        address _pepeFeed
    ) {
        priceFeeds[uint8(Horse.BTC)] = AggregatorV3Interface(_btcFeed);
        priceFeeds[uint8(Horse.SOL)] = AggregatorV3Interface(_solFeed);
        priceFeeds[uint8(Horse.DOGE)] = AggregatorV3Interface(_dogeFeed);
        priceFeeds[uint8(Horse.PEPE)] = AggregatorV3Interface(_pepeFeed);
        
        // Start first round
        _startNewRound();
    }
    
    // ============ Public Functions ============
    
    /**
     * @dev Place a bet on a horse
     * @param horseId 0: BTC, 1: ETH, 2: MONAD, 3: DOGE
     */
    function placeBet(uint8 horseId) external payable {
        require(horseId < 4, "Invalid horse ID");
        require(msg.value >= MIN_BET_AMOUNT, "Bet amount too low");
        require(msg.value <= MAX_BET_AMOUNT, "Bet amount too high");
        
        Round storage round = rounds[currentRoundId];
        uint256 elapsed = block.timestamp - round.startTime;
        require(elapsed <= BETTING_PHASE_END, "Betting phase ended");
        
        // TODO: 한 유저가 여러 말에 베팅 가능 여부 결정
        // 현재는 여러 말에 베팅 가능하도록 구현
        
        bets[currentRoundId][msg.sender].push(Bet({
            bettor: msg.sender,
            horseId: horseId,
            amount: msg.value,
            claimed: false
        }));
        
        round.totalBets[horseId] += msg.value;
        
        emit BetPlaced(currentRoundId, msg.sender, horseId, msg.value);
    }
    
    /**
     * @dev Update horse positions based on price feeds
     * Should be called periodically during Racing Phase
     */
    function updatePositions() external {
        Round storage round = rounds[currentRoundId];
        uint256 elapsed = block.timestamp - round.startTime;
        
        require(elapsed >= RACING_PHASE_START, "Racing phase not started");
        require(elapsed < RACING_PHASE_END || round.phase == Phase.Racing, "Racing phase ended");
        
        if (round.phase == Phase.Betting) {
            round.phase = Phase.Racing;
        }
        
        // Check if any horse has reached finish line
        bool finished = false;
        for (uint8 i = 0; i < 4; i++) {
            if (round.positions[i] >= FINISH_POS && !finished) {
                round.winner = i;
                round.phase = Phase.Settlement;
                round.settled = true;
                finished = true;
                emit RoundSettled(currentRoundId, i);
                break;
            }
        }
        
        if (!finished) {
            // 마지막 업데이트 시간 계산 (첫 업데이트면 RACING_PHASE_START 시점부터)
            uint256 lastUpdate = round.lastUpdateTime;
            if (lastUpdate == 0) {
                // 첫 업데이트: RACING_PHASE_START 시점부터 계산
                lastUpdate = round.startTime + RACING_PHASE_START;
            }
            
            // 경과 시간 계산 (초 단위)
            uint256 currentTime = block.timestamp;
            uint256 timeDelta = currentTime - lastUpdate;
            
            // Update positions based on price changes and time elapsed
            for (uint8 i = 0; i < 4; i++) {
                int256 currentPrice = _getLatestPrice(i);
                int256 speed = _computeSpeed(i, currentPrice, round.lastPrices[i]);
                
                // 속도는 초당 단위이므로, 경과 시간(초)을 곱하여 실제 이동량 계산
                int256 movement = speed * int256(timeDelta);
                
                // Update position (movement can be negative, but position can't go below START_POS)
                if (movement > 0) {
                    round.positions[i] += uint256(movement);
                } else {
                    int256 newPos = int256(round.positions[i]) + movement;
                    if (newPos < int256(START_POS)) {
                        round.positions[i] = START_POS;
                    } else {
                        round.positions[i] = uint256(newPos);
                    }
                }
                
                round.lastPrices[i] = currentPrice;
                emit PositionUpdated(currentRoundId, i, round.positions[i]);
            }
            
            // 마지막 업데이트 시간 저장
            round.lastUpdateTime = currentTime;
            
            // Check if racing phase ended without winner
            if (elapsed >= RACING_PHASE_END && !finished) {
                _settleRound();
            }
        }
    }
    
    /**
     * @dev Settle the round and calculate winnings
     */
    function settleRound() external {
        Round storage round = rounds[currentRoundId];
        uint256 elapsed = block.timestamp - round.startTime;
        
        // 이미 정산되었지만 새 라운드가 시작되지 않은 경우 처리
        if (round.settled && elapsed >= ROUND_DURATION) {
            _startNewRound();
            return;
        }
        
        require(round.phase == Phase.Racing, "Not in racing phase");
        require(elapsed >= RACING_PHASE_END, "Racing phase not ended");
        
        _settleRound();
    }
    
    /**
     * @dev Force start a new round (for cases where settlement didn't trigger new round)
     */
    function startNewRound() external {
        Round storage round = rounds[currentRoundId];
        uint256 elapsed = block.timestamp - round.startTime;
        require(elapsed >= ROUND_DURATION, "Current round not finished");
        _startNewRound();
    }
    
    /**
     * @dev Claim winnings for a round
     * Calculates winnings on-demand to save gas
     */
    function claimWinnings(uint256 roundId) external {
        Round storage round = rounds[roundId];
        require(round.settled, "Round not settled");
        
        // Calculate user's winnings
        Bet[] memory userBets = bets[roundId][msg.sender];
        uint256 userBetOnWinner = 0;
        
        for (uint256 i = 0; i < userBets.length; i++) {
            if (userBets[i].horseId == round.winner && !userBets[i].claimed) {
                userBetOnWinner += userBets[i].amount;
                // Mark bet as claimed
                bets[roundId][msg.sender][i].claimed = true;
            }
        }
        
        require(userBetOnWinner > 0, "No winning bets");
        
        // Calculate winnings: proportional share of total pool
        uint256 totalBetOnWinner = round.totalBets[round.winner];
        uint256 totalPool = round.totalBets[0] + round.totalBets[1] + 
                          round.totalBets[2] + round.totalBets[3];
        
        uint256 winningsAmount = (userBetOnWinner * totalPool) / totalBetOnWinner;
        
        // Add to claimed winnings to prevent double claiming
        winnings[roundId][msg.sender] += winningsAmount;
        
        (bool success, ) = msg.sender.call{value: winningsAmount}("");
        require(success, "Transfer failed");
        
        emit WinningsClaimed(roundId, msg.sender, winningsAmount);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get current round information
     */
    function getCurrentRound() external view returns (
        uint256 roundId,
        uint256 startTime,
        Phase phase,
        uint8 winner,
        bool settled
    ) {
        Round storage round = rounds[currentRoundId];
        return (
            currentRoundId,
            round.startTime,
            round.phase,
            round.winner,
            round.settled
        );
    }
    
    /**
     * @dev Get horse positions for current round
     */
    function getPositions() external view returns (uint256[4] memory) {
        Round storage round = rounds[currentRoundId];
        return [
            round.positions[0],
            round.positions[1],
            round.positions[2],
            round.positions[3]
        ];
    }
    
    /**
     * @dev Get total bets for each horse in current round
     */
    function getTotalBets() external view returns (uint256[4] memory) {
        Round storage round = rounds[currentRoundId];
        return [
            round.totalBets[0],
            round.totalBets[1],
            round.totalBets[2],
            round.totalBets[3]
        ];
    }
    
    /**
     * @dev Get user's bets for a round
     */
    function getUserBets(uint256 roundId, address user) external view returns (Bet[] memory) {
        return bets[roundId][user];
    }
    
    /**
     * @dev Get user's winnings for a round
     * Calculates potential winnings if round is settled
     */
    function getUserWinnings(uint256 roundId, address user) external view returns (uint256) {
        Round storage round = rounds[roundId];
        
        // If already claimed, return stored amount
        if (winnings[roundId][user] > 0) {
            return winnings[roundId][user];
        }
        
        // If round not settled, return 0
        if (!round.settled) {
            return 0;
        }
        
        // Calculate potential winnings
        Bet[] memory userBets = bets[roundId][user];
        uint256 userBetOnWinner = 0;
        
        for (uint256 i = 0; i < userBets.length; i++) {
            if (userBets[i].horseId == round.winner && !userBets[i].claimed) {
                userBetOnWinner += userBets[i].amount;
            }
        }
        
        if (userBetOnWinner == 0) {
            return 0;
        }
        
        uint256 totalBetOnWinner = round.totalBets[round.winner];
        uint256 totalPool = round.totalBets[0] + round.totalBets[1] + 
                          round.totalBets[2] + round.totalBets[3];
        
        return (userBetOnWinner * totalPool) / totalBetOnWinner;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Start a new round
     */
    function _startNewRound() internal {
        currentRoundId++;
        Round storage round = rounds[currentRoundId];
        round.startTime = block.timestamp;
        round.lastUpdateTime = 0; // 첫 업데이트 전까지 0으로 유지
        round.phase = Phase.Betting;
        
        // Initialize positions
        for (uint8 i = 0; i < 4; i++) {
            round.positions[i] = START_POS;
            round.lastPrices[i] = _getLatestPrice(i);
        }
        
        emit RoundStarted(currentRoundId, round.startTime);
    }
    
    /**
     * @dev Settle the round by determining winner and calculating winnings
     */
    function _settleRound() internal {
        Round storage round = rounds[currentRoundId];
        
        if (round.settled) return;
        
        // If no horse reached finish line, winner is the one with highest position
        if (round.winner == 0 && round.positions[0] < FINISH_POS) {
            uint256 maxPos = 0;
            uint8 winnerId = 0;
            
            for (uint8 i = 0; i < 4; i++) {
                if (round.positions[i] > maxPos) {
                    maxPos = round.positions[i];
                    winnerId = i;
                } else if (round.positions[i] == maxPos && i < winnerId) {
                    // Tie-break: lower ID wins
                    winnerId = i;
                }
            }
            
            round.winner = winnerId;
        }
        
        round.phase = Phase.Settlement;
        round.settled = true;
        
        emit RoundSettled(currentRoundId, round.winner);
        
        // Start next round after settlement period
        if (block.timestamp - round.startTime >= ROUND_DURATION) {
            _startNewRound();
        }
    }
    
    /**
     * @dev Get latest price from Chainlink Price Feed
     */
    function _getLatestPrice(uint8 horseId) internal view returns (int256) {
        AggregatorV3Interface priceFeed = priceFeeds[horseId];
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        require(updatedAt > 0, "Price feed not available");
        return price;
    }
    
    /**
     * @dev Compute speed based on price change
     * SPEED_FORMULA_TODO: 이 함수를 수정하여 속도 결정식을 튜닝할 수 있습니다
     */
    function _computeSpeed(uint8 horseId, int256 currentPrice, int256 lastPrice) internal pure returns (int256) {
        if (lastPrice == 0) {
            return BASE_SPEED;
        }
        
        // Calculate price change in basis points (더 정밀한 계산)
        int256 changeBps = ((currentPrice - lastPrice) * 100000000) / lastPrice;
        
        // Speed formula: BASE_SPEED + changeBps * SPEED_MULTIPLIER
        int256 speed = BASE_SPEED + (changeBps * SPEED_MULTIPLIER / 1000000);
        
        // Minimum speed to prevent negative movement (can be adjusted)
        if (speed < -50) {
            speed = -50;
        }
        
        return speed;
    }
    
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
    
    // ============ Chainlink Automation Functions ============
    
    /**
     * @dev Chainlink Automation: Check if upkeep is needed
     * @param checkData Data passed from Automation Registry
     * @return upkeepNeeded Whether upkeep is needed
     * @return performData Data to pass to performUpkeep
     */
    function checkUpkeep(bytes calldata /* checkData */) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory performData) 
    {
        Round storage round = rounds[currentRoundId];
        uint256 elapsed = block.timestamp - round.startTime;
        
        // Check if we're in Racing Phase and need position update
        bool inRacingPhase = elapsed >= RACING_PHASE_START && 
                           elapsed < RACING_PHASE_END && 
                           !round.settled;
        
        // Check if we need to settle the round
        bool needsSettlement = elapsed >= RACING_PHASE_END && 
                              round.phase == Phase.Racing && 
                              !round.settled;
        
        // Check if we need to start a new round
        bool needsNewRound = elapsed >= ROUND_DURATION && 
                            round.settled;
        
        upkeepNeeded = inRacingPhase || needsSettlement || needsNewRound;
        performData = ""; // Empty for now, can encode action type if needed
    }
    
    /**
     * @dev Chainlink Automation: Perform upkeep
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        Round storage round = rounds[currentRoundId];
        uint256 elapsed = block.timestamp - round.startTime;
        
        // Update positions if in Racing Phase
        if (elapsed >= RACING_PHASE_START && elapsed < RACING_PHASE_END && !round.settled) {
            // Call internal update logic
            if (round.phase == Phase.Betting) {
                round.phase = Phase.Racing;
            }
            
            // Check if any horse has reached finish line
            bool finished = false;
            for (uint8 i = 0; i < 4; i++) {
                if (round.positions[i] >= FINISH_POS && !finished) {
                    round.winner = i;
                    round.phase = Phase.Settlement;
                    round.settled = true;
                    finished = true;
                    emit RoundSettled(currentRoundId, i);
                    break;
                }
            }
            
            if (!finished) {
                // Update positions based on price changes
                for (uint8 i = 0; i < 4; i++) {
                    int256 currentPrice = _getLatestPrice(i);
                    int256 speed = _computeSpeed(i, currentPrice, round.lastPrices[i]);
                    
                    if (speed > 0) {
                        round.positions[i] += uint256(speed);
                    } else {
                        int256 newPos = int256(round.positions[i]) + speed;
                        if (newPos < int256(START_POS)) {
                            round.positions[i] = START_POS;
                        } else {
                            round.positions[i] = uint256(newPos);
                        }
                    }
                    
                    round.lastPrices[i] = currentPrice;
                    emit PositionUpdated(currentRoundId, i, round.positions[i]);
                }
                
                // Check if racing phase ended without winner
                if (elapsed >= RACING_PHASE_END && !finished) {
                    _settleRound();
                }
            }
        }
        // Settle round if needed
        else if (elapsed >= RACING_PHASE_END && round.phase == Phase.Racing && !round.settled) {
            _settleRound();
        }
        // Start new round if needed
        else if (elapsed >= ROUND_DURATION && round.settled) {
            _startNewRound();
        }
    }
}

