const Web3 = require('web3');

app.post('/verifyAttribute', async (req, res) => {
    const { userAddress, requiredAttribute } = req.body;
  
    // 调用智能合约的属性验证函数
    const isValid = await contract.methods.checkUserAttribute(userAddress, requiredAttribute).call();
  
    res.json({ success: true, isValid });
  });