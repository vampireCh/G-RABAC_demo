// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserManagement {
    struct User {
        string username;               // 用户名
        address ethereumAddress;       // 用户的以太坊地址
        bool isApproved;               // 用户是否获得批准
        uint riskScore;                // 新增：用户的风险评分
    }

    address public owner;             // 合约拥有者的地址
    mapping(address => User) public users; // 地址到用户的映射

    // 事件：用户注册
    event UserRegistered(address indexed userAddress, string username);
    // 事件：用户批准状态改变
    event UserApprovalChanged(address indexed userAddress, bool isApproved);
    // 新增事件：用户访问被冻结
    event AccessFrozen(address indexed userAddress);
    // 新增事件：记录异常行为
    event AnomalyRecorded(address indexed userAddress, string record);
    // 新增事件：记录异常访问事件
    event AccessEventRecorded(address indexed userAddress, string eventType, string reason, uint timestamp);

    // 构造函数，初始化合约时设置拥有者为部署者
    constructor() {
        owner = msg.sender;
    }

    // 仅限拥有者调用的修饰符
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized"); // 检查调用者是否为拥有者
        _;
    }

    // 用户注册函数
    function register(string memory _username, address _ethereumAddress) public {
        require(users[_ethereumAddress].ethereumAddress != _ethereumAddress, "User already registered");
        users[_ethereumAddress] = User(_username, _ethereumAddress, false, 0); // 初始化风险评分为0
        emit UserRegistered(_ethereumAddress, _username); // 发出用户注册事件
    }

    // 管理员批准用户函数
    function approveUser(address _userAddress) public onlyOwner {
        require(users[_userAddress].ethereumAddress == _userAddress, "User not found");
        require(!users[_userAddress].isApproved, "User already approved");
        users[_userAddress].isApproved = true;
        emit UserApprovalChanged(_userAddress, true); // 发出用户批准状态改变事件
    }

    // 管理员拒绝或撤销用户批准的函数
    function rejectUser(address _userAddress) public onlyOwner {
        require(users[_userAddress].ethereumAddress == _userAddress, "User not found");
        users[_userAddress].isApproved = false;
        emit UserApprovalChanged(_userAddress, false); // 发出用户批准状态改变事件
    }

    // 检查用户是否获得批准的函数
    function isUserApproved(address _userAddress) public view returns (bool) {
        return users[_userAddress].isApproved;
    }

    // 从外部更新用户风险评分的函数
    function updateRiskScoreExternally(address _userAddress, uint _riskScore) public {
        require(users[_userAddress].ethereumAddress == _userAddress, "User not found");
        users[_userAddress].riskScore = _riskScore; // 更新风险评分
        if (_riskScore >= 100) {
            users[_userAddress].isApproved = false; // 冻结用户访问权限
            emit AccessFrozen(_userAddress); // 发出用户访问被冻结事件
            emit AnomalyRecorded(_userAddress, "High risk score: automatic freeze"); // 记录异常行为
        }
    }

    // 新增函数：记录异常访问信息
    function recordAccessEvent(address _userAddress, string memory _eventType, string memory _reason, uint _timestamp) public onlyOwner {
        emit AccessEventRecorded(_userAddress, _eventType, _reason, _timestamp); // 发出异常访问事件记录
    }
}
