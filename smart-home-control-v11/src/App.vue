<template>
  <div id="app">
    <!-- base_layout.html -->
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>SMART-HOME-CONTROL</title>
    <!-- 其他头部信息 -->
</head>
<body>
    <header>
        <h1 style="display: flex;">SMART-HOME-CONTROL</h1>
    </header>

    <!-- 页面特定内容将在这里插入 -->
    <main>
        <!-- {% block content %}{% endblock %} -->
    </main>
</body>
</html>

    <!-- 主要内容区域，当前路由对应的组件将在这里渲染 -->
    <main>
      <router-view></router-view>
    </main>
  </div>
</template>

<script>
export default {
  name: 'App'
  // 如果需要，这里可以添加组件的逻辑，比如methods、computed属性等
};
</script>

<style>
.title-container {
    text-align: center; /* 将内容居中 */
    margin-top: 50px; /* 根据需要设置顶部间距 */
    width: 100%; /* 设置父容器宽度为100% */
}

.title-link {
    display: inline-block; /* 将链接元素设置为块级元素 */
    font-size: 36px; /* 根据需要设置字体大小 */
    color: #333; /* 根据需要设置颜色 */
    text-decoration: none; /* 去除链接下划线 */
    /* 添加其他样式 */
}
.h1{
  text-align: center;
}
</style>
