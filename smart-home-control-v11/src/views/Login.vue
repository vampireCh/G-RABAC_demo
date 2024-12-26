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
    // 1. 请求 MetaMask 授权并获取账号
    async loginWithEthereum() {
      if (!window.ethereum) {
        return alert('请安装 MetaMask');
      }
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];
        
        // 检查用户是否已批准
        await this.checkUserApproval(account);
      } catch (error) {
        console.error("获取账户失败:", error);
        alert("无法获取账户，请检查钱包连接状态。");
      }
    },

    // 2. 调用后端检查用户审批状态
    async checkUserApproval(account) {
      try {
        const response = await fetch('http://localhost:3000/api/admin/checkUserApproval', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ethereumAddress: account }),
        });
        const data = await response.json();

        if (data.isApproved) {
          // 如果用户已批准，则继续签名
          this.signMessage(account);
        } else {
          alert('用户未获得批准');
        }
      } catch (error) {
        console.error('Failed to check user approval:', error);
        alert('检查用户批准状态失败');
      }
    },

    // 3. 使用 personal_sign 签名消息
    async signMessage(account) {
      // 随便定义需要签名的文本，可根据需要改成更具体/带时间戳等
      const message = "Hello, personal_sign test message from " + account;

      try {
        // 通过 ethers.js 的 provider 方式来调用 personal_sign
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        // 使用 signer.signMessage(...) 即可完成 personal_sign
        const signature = await signer.signMessage(message);

        // 接下来将签名与地址发送到后端进行验证
        await this.verifySignature(account, message, signature);
      } catch (error) {
        console.error('Failed to sign message:', error);
        alert('签名失败');
      }
    },

    // 4. 调用后端 /api/verifySignature，验证签名
    async verifySignature(account, message, signature) {
      try {
        const response = await fetch('http://localhost:3000/api/verifySignature', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ account, message, signature }),
        });
        const data = await response.json();

        if (data.success) {
          alert('登录成功');
          // 跳转到用户的 dashboard 页面（示例）
          this.$router.push('/dashboard');
        } else {
          alert('登录失败: ' + (data.error || 'Address mismatch'));
        }
      } catch (err) {
        console.error("Error verifying signature:", err);
        alert('登录失败');
      }
    },
  },
};
</script>
