<template>
  <div>
    <h2>用户注册</h2>
    <form @submit.prevent="registerUser">
      <div>
        <label for="username">用户名:</label>
        <input id="username" v-model="username" type="text" required>
      </div>
      <div>
        <label for="ethereumAddress">以太坊地址:</label>
        <input id="ethereumAddress" v-model="ethereumAddress" type="text" required>
      </div>
      <button type="submit">注册</button>
    </form>
  </div>
</template>

<script>
import Web3 from 'web3';
import contractABI from '../../path/contractABI.json'; // 更新为你的智能合约ABI的路径
const contractAddress = '0x39aa6fC93d728215BbCF48b5C4BaFD0205195A04'; // 更新为你的智能合约地址

export default {
  name: 'UserRegister',
  data() {
    return {
      username: '',
      ethereumAddress: '',
      web3: null,
      contract: null,
    };
  },
  mounted() {
    this.initializeWeb3();
  },
  methods: {
    initializeWeb3() {
      if (window.ethereum) {
        this.web3 = new Web3(window.ethereum);
        this.contract = new this.web3.eth.Contract(contractABI, contractAddress);
      } else {
        console.error('Ethereum wallet not detected');
      }
    },
    async registerUser() {
      if (!this.ethereumAddress || !this.username) {
        alert('所有字段都是必填的。');
        return;
      }

      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0]; 

        await this.contract.methods.register(this.username, this.ethereumAddress).send({ from: account });

        alert('注册请求已发送，请等待管理员审批。');
      } catch (error) {
        console.error('注册用户时出错:', error);
        alert('注册失败，请重试。');
      }
    },
  },
};
</script>
