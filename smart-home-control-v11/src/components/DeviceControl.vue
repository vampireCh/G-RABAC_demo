<!-- 这个组件可以展示设备状态并根据用户角色提供控制选项 -->
<template>
    <div>
      <h3>{{ device.name }}</h3>
      <p>Status: {{ device.status }}</p>
      <button  @click="toggleDevice">ON/OFF</button>
      <button  @click="toggleDevice">READ</button>
      <button  @click="toggleDevice">WRITE</button>
      <button  @click="toggleDevice">REVISE</button>
    </div>
  </template>
  
  <script>
  export default {
    props: ['device', 'role'],
    methods: {
      async toggleDevice() {
        // 调用Web3服务来切换设备状态
        console.log(`Toggling device ${this.device.name}`);
      }
    }
  }
  </script>
  