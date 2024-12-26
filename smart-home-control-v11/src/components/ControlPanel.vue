<!-- 将展示几个设备的状态并提供开关按钮来控制它们 -->
<template>
    <div class="control-panel">
      <h1>智能家居控制面板</h1>
      <div v-for="device in devices" :key="device.id" class="device">
        <h2>{{ device.name }}</h2>
        <p>状态：{{ device.isOn ? '开启' : '关闭' }}</p>
        <button @click="toggleDevice(device.id)">
          {{ device.isOn ? '关闭' : '开启' }}
        </button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'ControlPanel',
    // data部分定义了一个devices数组，包含了每个设备的id、name和isOn状态
    data() {
      return {
        devices: [
          { id: 1, name: '空气净化器', isOn: false },
          { id: 2, name: '智能灯光', isOn: true },
          // 添加更多设备
        ]
      };
    },
    methods: {
        // 用于切换选中设备的状态
        // 使用v-for指令遍历devices数组，为每个设备渲染一个信息块和一个按钮。按钮的点击事件绑定到toggleDevice方法，传递当前设备的id作为参数
      toggleDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (device) {
          device.isOn = !device.isOn;
        }
      }
    }
  }
  </script>
  
  <style scoped>
  .control-panel {
    max-width: 600px;
    margin: auto;
    text-align: center;
  }
  
  .device {
    border: 1px solid #ddd;
    padding: 20px;
    margin-bottom: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  button {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    background-color: #577399;
    color: white;
  }
  
  button:hover {
    background-color: #495867;
  }
  </style>
  