pragma solidity >= 0.5.0;

import "./Dog.sol";

contract Dog {

    string public Name;

    constructor(string memory name) public {
        Name = name;
    }
}