<template>
  <div class="app-container">
    <el-container v-if="userStore.isLoggedIn">
      <el-aside width="200px" class="sidebar">
        <div class="logo">
          <h1>考试管理系统</h1>
        </div>
        <el-menu
          :default-active="route.path"
          class="el-menu-vertical-demo"
        >
          <el-menu-item index="/dashboard">
            <i class="el-icon-s-home"></i>
            <span>仪表盘</span>
          </el-menu-item>
          <el-sub-menu index="/users">
            <template #title>
              <i class="el-icon-user"></i>
              <span>用户管理</span>
            </template>
            <el-menu-item index="/users/list">用户列表</el-menu-item>
            <el-menu-item index="/users/create">创建用户</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="/questions">
            <template #title>
              <i class="el-icon-document"></i>
              <span>题库管理</span>
            </template>
            <el-menu-item index="/questions/list">题目列表</el-menu-item>
            <el-menu-item index="/questions/create">创建题目</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="/papers">
            <template #title>
              <i class="el-icon-document-copy"></i>
              <span>试卷管理</span>
            </template>
            <el-menu-item index="/papers/list">试卷列表</el-menu-item>
            <el-menu-item index="/papers/create">创建试卷</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="/exams">
            <template #title>
              <i class="el-icon-time"></i>
              <span>考试管理</span>
            </template>
            <el-menu-item index="/exams/list">考试列表</el-menu-item>
            <el-menu-item index="/exams/create">创建考试</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="/scores">
            <template #title>
              <i class="el-icon-star-on"></i>
              <span>成绩管理</span>
            </template>
            <el-menu-item index="/scores/list">成绩列表</el-menu-item>
            <el-menu-item index="/scores/analysis">成绩分析</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="/media">
            <template #title>
              <i class="el-icon-picture"></i>
              <span>媒体管理</span>
            </template>
            <el-menu-item index="/media/list">媒体列表</el-menu-item>
            <el-menu-item index="/media/upload">上传媒体</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header class="header">
          <div class="header-right">
            <el-dropdown>
              <span class="user-info">
                {{ userStore.user?.username }}
                <i class="el-icon-arrow-down"></i>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="router.push('/profile')">个人资料</el-dropdown-item>
                  <el-dropdown-item @click="userStore.logout().then(() => router.push('/login'))">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        <el-main class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
    <router-view v-else />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from './stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 初始化时检查登录状态
onMounted(async () => {
  const isLoggedIn = await userStore.checkLogin()
  if (!isLoggedIn && route.path !== '/login') {
    router.push('/login')
  }
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  background-color: #2c3e50;
  color: white;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #34495e;
}

.logo h1 {
  font-size: 18px;
  margin: 0;
  color: white;
}

.el-menu-vertical-demo {
  background-color: #2c3e50;
  color: white;
}

.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
  min-height: 400px;
}

.el-menu-item {
  color: white;
}

.el-menu-item:hover {
  background-color: #34495e;
}

.el-menu-item.is-active {
  background-color: #3498db;
}

.header {
  background-color: #ffffff;
  border-bottom: 1px solid #eaeaea;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 20px;
}

.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.main-content {
  padding: 20px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
