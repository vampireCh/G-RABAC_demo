<template>
    <div>
      <h2>Pending Users</h2>
      <ul>
        <li v-for="user in users" :key="user.ethereumAddress">
          {{ user.username }} ({{ user.ethereumAddress }})
          <button @click="approveUser(user.ethereumAddress)">Approve</button>
        </li>
      </ul>
    </div>
  </template>
  
  <script>
  import axios from 'axios';
  
  export default {
    data() {
      return {
        users: [],
      };
    },
    methods: {
      fetchPendingUsers() {
        axios.get('http://localhost:3000/api/admin/pendingUsers')
          .then(response => {
            this.users = response.data;
          })
          .catch(error => {
            console.error("There was an error fetching the pending users: ", error);
          });
      },
      approveUser(ethereumAddress) {
        axios.post(`http://localhost:3000/api/admin/approveUser/${ethereumAddress}`)
          .then(() => {
            this.fetchPendingUsers(); // Refresh the list after approving
            alert('User approved successfully');
          })
          .catch(error => {
            console.error("There was an error approving the user: ", error);
          });
      }
    },
    mounted() {
      this.fetchPendingUsers();
    }
  };
  </script>
  