<template>
    <button @click="clickHandler">{{ buttonText }}</button>
  </template>
  
  <script>
  export default {
    name: 'MyButton',
    props: ['buttonText'],
    methods: {
      clickHandler() {
        // 处理按钮点击事件
        alert('按钮被点击！');
      }
    }
  }
  </script>
  
  <style scoped>
  button {
    padding: 10px 20px;
    background-color: blue;
    color: white;
    border: none;
    border-radius: 5px;
  }
  </style>
  