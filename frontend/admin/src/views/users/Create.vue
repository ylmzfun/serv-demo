<template>
  <div class="user-create-container">
    <h2>{{ isEdit ? '编辑用户' : '创建用户' }}</h2>
    <el-card shadow="hover">
      <el-form :model="userForm" :rules="rules" ref="userFormRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名"></el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="userForm.password" type="password" placeholder="请输入密码" show-password></el-input>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin"></el-option>
            <el-option label="教师" value="teacher"></el-option>
            <el-option label="学生" value="student"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">保存</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from '../../utils/axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userFormRef = ref()
const loading = ref(false)
const userId = computed(() => route.query.id as string)
const isEdit = computed(() => !!userId.value)

const userForm = reactive({
  username: '',
  password: '',
  role: 'student'
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: !isEdit, message: '请输入密码', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'blur' }
  ]
}

const fetchUserInfo = async () => {
  if (!isEdit.value) return
  
  try {
    const user = await axios.get(`/api/admin/users/${userId.value}`)
    
    userForm.username = user.username
    userForm.role = user.role
  } catch (error) {
    console.error('Fetch user info failed:', error)
    ElMessage.error('获取用户信息失败')
  }
}

const handleSubmit = async () => {
  if (!userFormRef.value) return
  
  const valid = await userFormRef.value.validate()
  if (!valid) return
  
  loading.value = true
  
  try {
    if (isEdit.value) {
      // 编辑用户
      await axios.patch(`/api/admin/users/${userId.value}`, {
        username: userForm.username,
        role: userForm.role
      })
    } else {
      // 创建用户
      await axios.post('/api/admin/users', userForm)
    }
    
    ElMessage.success(isEdit.value ? '编辑用户成功' : '创建用户成功')
    router.push('/users/list')
  } catch (error) {
    console.error(isEdit.value ? 'Edit user failed:' : 'Create user failed:', error)
    ElMessage.error(isEdit.value ? '编辑用户失败' : '创建用户失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  router.push('/users/list')
}

onMounted(() => {
  fetchUserInfo()
})
</script>

<style scoped>
.user-create-container {
  padding: 0;
}
</style>
