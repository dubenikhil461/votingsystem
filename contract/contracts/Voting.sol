// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Voting {
    address public admin;

    enum ElectionState {
        NotStarted,
        Ongoing,
        Ended
    }

    struct Candidate {
        string name;
        uint256 voteCount;
    }

    ElectionState public state;
    Candidate[] public candidates;
    mapping(address => bool) public isWhitelisted;
    mapping(address => bool) public hasVoted;

    event CandidateAdded(uint256 indexed index, string name);
    event VoterWhitelisted(address indexed voter);
    event ElectionStarted();
    event VoteCast(address indexed voter, uint256 indexed candidateIndex);
    event ElectionEnded();

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyBeforeStart() {
        require(state == ElectionState.NotStarted, "Election already started");
        _;
    }

    modifier onlyDuringElection() {
        require(state == ElectionState.Ongoing, "Election is not ongoing");
        _;
    }

    constructor() {
        admin = msg.sender;
        state = ElectionState.NotStarted;
    }

    function addCandidate(string memory name) external onlyAdmin onlyBeforeStart {
        require(bytes(name).length > 0, "Name required");
        candidates.push(Candidate({name: name, voteCount: 0}));
        emit CandidateAdded(candidates.length - 1, name);
    }

    function whitelistVoter(address voter) external onlyAdmin onlyBeforeStart {
        require(voter != address(0), "Invalid voter");
        isWhitelisted[voter] = true;
        emit VoterWhitelisted(voter);
    }

    function startElection() external onlyAdmin onlyBeforeStart {
        require(candidates.length > 1, "Add at least 2 candidates");
        state = ElectionState.Ongoing;
        emit ElectionStarted();
    }

    function vote(uint256 candidateIndex) external onlyDuringElection {
        require(isWhitelisted[msg.sender], "Not whitelisted");
        require(!hasVoted[msg.sender], "Already voted");
        require(candidateIndex < candidates.length, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[candidateIndex].voteCount += 1;
        emit VoteCast(msg.sender, candidateIndex);
    }

    function endElection() external onlyAdmin onlyDuringElection {
        state = ElectionState.Ended;
        emit ElectionEnded();
    }

    function getCandidate(uint256 index) external view returns (string memory name, uint256 voteCount) {
        require(index < candidates.length, "Invalid candidate");
        Candidate storage candidate = candidates[index];
        return (candidate.name, candidate.voteCount);
    }

    function getAllCandidates() external view returns (Candidate[] memory) {
        return candidates;
    }

    function getWinner() external view returns (string memory winnerName, uint256 winnerVotes) {
        require(state == ElectionState.Ended, "Election not ended");
        require(candidates.length > 0, "No candidates");

        uint256 maxVotes = 0;
        uint256 winnerIndex = 0;
        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winnerIndex = i;
            }
        }
        return (candidates[winnerIndex].name, candidates[winnerIndex].voteCount);
    }
}
