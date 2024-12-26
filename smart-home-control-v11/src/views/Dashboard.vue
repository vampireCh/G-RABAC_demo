<template>
  <div>
    <form @submit.prevent="submitForm">
      <div class="mb-3">
        <label for="Sub" class="form-label">Subject</label>
        <input type="text" class="form-control" v-model="form.Sub" required>
      </div>
      <div class="mb-3">
        <label for="Act" class="form-label">Action</label>
        <input type="text" class="form-control" v-model="form.Act" required>
      </div>
      <div class="mb-3">
        <label for="Obj" class="form-label">Object</label>
        <input type="text" class="form-control" v-model="form.Obj" required>
      </div>
      <div class="form-check mb-3">
        <input type="checkbox" class="form-check-input" id="emergencyCheck" v-model="form.Emergency">
        <label class="form-check-label" for="emergencyCheck">Emergency</label>
      </div>
      <button type="submit" class="btn btn-primary">Submit Request</button>
    </form>
    <div class="mt-3">
      <pre>{{ result }}</pre>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      form: {
        Sub: '',
        Act: '',
        Obj: '',
        Emergency: false
      },
      result: ''
    };
  },
  methods: {
    async submitForm() {
      const env = await this.getEnvData();
      try {
        const response = await axios.post('http://localhost:3000/access-request', { ...this.form, Env: env });
        this.result = JSON.stringify(response.data, null, 2);
      } catch (error) {
        console.error('Error:', error);
        this.result = 'Error in processing your request';
      }
    },
    async getEnvData() {
      const location = await this.getCurrentLocation();
      const userAgent = navigator.userAgent;
      return {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0],
        latitude: location.latitude,
        longitude: location.longitude,
        userAgent: userAgent,
        emergency: this.form.Emergency
      };
    },
    getCurrentLocation() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by this browser.'));
        } else {
          navigator.geolocation.getCurrentPosition(
            position => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            },
            () => {
              reject(new Error('Unable to retrieve your location.'));
            }
          );
        }
      });
    }
  }
}
</script>

<style scoped>
/* 组件级别的CSS */
</style>
