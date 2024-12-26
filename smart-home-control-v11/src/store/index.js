import { createStore } from 'vuex';
//配置Vuex状态管理，用于存储用户角色和设备列表
export default createStore({
  state: {
    role: 'parent', // 默认角色，你可以根据需要调整
    devices: [
      { id: 1, name: 'Air Purifier', status: 'Off' },
      // 在这里添加更多设备
    ]
  },
  mutations: {
    setRole(state, role) {
      state.role = role;
    },
    toggleDeviceStatus(state, deviceId) {
      const device = state.devices.find(device => device.id === deviceId);
      if (device) {
        device.status = device.status === 'Off' ? 'On' : 'Off';
      }
    }
  },
  actions: {
    changeRole({ commit }, role) {
      commit('setRole', role);
    },
    toggleDevice({ commit }, deviceId) {
      commit('toggleDeviceStatus', deviceId);
    }
  },
  getters: {
    getRole: state => state.role,
    getDevices: state => state.devices
  }
});
