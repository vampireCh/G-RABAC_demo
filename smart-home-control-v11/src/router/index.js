import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';
import RegisterUser from '../views/RegisterUser.vue';
import admin from '../views/admin.vue';
import Signature from '../views/Signature.vue';
// 配置路由，添加Dashboard和Login视图
const routes = [
  {
    path: '/',
    redirect: '/login' // 重定向到登录页面
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  // 你可以在这里添加更多路由
  {
    path: '/RegisterUser',
    name:'/RegisterUser',
    component: RegisterUser
  },
  {
    path: '/admin',
    name:'/admin',
    component: admin
  },
  {
    path: '/Signature',
    name:'/Signature',
    component: Signature
  },
];


const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

export default router;
