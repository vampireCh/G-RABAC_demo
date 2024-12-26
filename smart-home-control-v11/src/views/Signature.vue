<template>
  <div>
    <h2>用户登录</h2>
    <button @click="loginWithEthereum">使用以太坊地址登录</button>
  </div>
</template>

<script>
import { ethers } from 'ethers';

export default {
  name: 'Login',
  methods: {
    async loginWithEthereum() {
      if (!window.ethereum) {
        return alert('请安装MetaMask');
      }
      
      // 请求用户授权并获取账号
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      // 调用签名函数
      this.signMessage(account);
    },
    
    async signMessage(account) {
      // 1. 从钱包获取 chainId（通常为十六进制）
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      // 2. 将十六进制字符串转为十进制整数
      const chainId = parseInt(chainIdHex, 16);

      // 构造 EIP-712 签名所需的 domain, types, value
      const domain = {
        name: 'Ether Mail',
        version: '1',
        chainId,  // 使用转换后的 chainId
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
      };
      const types = {
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' }
        ],
      };
      const value = {
        name: 'John Doe',
        wallet: account,
      };

      // 获取签名者（当前选中的钱包地址）
      const signer = new ethers.providers.Web3Provider(window.ethereum).getSigner();

      try {
        // 使用 Ethers.js 的 _signTypedData 方法进行 EIP-712 签名
        const signature = await signer._signTypedData(domain, types, value);
        
        // 将签名与地址发送到后端进行验证
        this.verifySignature(account, signature);
      } catch (error) {
        console.error('Failed to sign message:', error);
        alert('签名失败');
      }
    },
    
    async verifySignature(account, signature) {
      // 向后端发送验证请求
      const response = await fetch('http://localhost:3000/api/verifySignature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ account, signature }),
      });

      const { success } = await response.json();
      if (success) {
        alert('登录成功');
      } else {
        alert('登录失败');
      }
    }
  },
};
</script>
