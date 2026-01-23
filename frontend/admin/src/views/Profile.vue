<template>
  <div class="profile-container">
    <h1>个人资料</h1>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>账户信息</span>
        </div>
      </template>
      <div class="profile-form">
        <el-form :model="form" label-width="80px">
          <el-form-item label="用户名">
            <el-input v-model="form.username" disabled />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" disabled />
          </el-form-item>
          <el-form-item label="角色">
            <el-input v-model="form.role" disabled />
          </el-form-item>
          <el-form-item label="创建时间">
            <el-input v-model="form.createdAt" disabled />
          </el-form-item>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { formatDate } from '@/utils/date'

const userStore = useUserStore()
const form = ref({
  username: '',
  email: '',
  role: '',
  createdAt: ''
})

onMounted(async () => {
  await userStore.getProfile()
  if (userStore.user) {
    form.value = {
      username: userStore.user.username,
      email: userStore.user.email,
      role: userStore.user.role,
      createdAt: formatDate(userStore.user.createdAt)
    }
  }
})
</script>

<style scoped>
.profile-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-form {
  max-width: 600px;
}
</style>
