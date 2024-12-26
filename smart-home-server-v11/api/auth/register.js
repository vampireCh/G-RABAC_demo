const Web3 = require('web3');
// Ganache运行在端口HTTP://127.0.0.1:7545
const web3 = new Web3('HTTP://127.0.0.1:7545');

const contractABI = [[
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_attribute",
				"type": "string"
			}
		],
		"name": "registerUser",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_userAddress",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "_requiredAttribute",
				"type": "string"
			}
		],
		"name": "checkUserAttribute",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "users",
		"outputs": [
			{
				"internalType": "bool",
				"name": "registered",
				"type": "bool"
			},
			{
				"internalType": "string",
				"name": "attribute",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]];// 你的合约ABI
const contractAddress = '0x5805A887e1CBD2714FC4fF8f87615cD4AD1eB8f5';// 你的合约地址
const contract = new web3.eth.Contract(contractABI, contractAddress);

app.post('/register', async (req, res) => {
    const { attribute } = req.body;
    const fromAddress = ''; // 管理员地址或用户地址，需要有发送交易的权限

    // 调用智能合约的注册函数
    const receipt = await contract.methods.registerUser(attribute).send({ from: fromAddress });

    res.json({ success: true, receipt });
});
