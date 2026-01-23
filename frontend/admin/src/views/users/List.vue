<template>
  <div class="user-list-container">
    <h2>用户管理</h2>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
          <el-button type="primary" @click="navigateToCreate">创建用户</el-button>
        </div>
      </template>
      <div class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名"
          style="width: 200px; margin-right: 10px;"
          prefix-icon="Search"
        >
        </el-input>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>
      <el-table :data="users" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="role" label="角色" />
        <el-table-column prop="created_at" label="创建时间" />
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleEdit(scope.row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../../utils/axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const users = ref([])
const loading = ref(false)
const searchQuery = ref('')
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

const fetchUsers = async () => {
  loading.value = true
  try {
    const data = await axios.get('/api/admin/users', {
      params: {
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
        query: searchQuery.value
      }
    })
    
    users.value = data
    pagination.value.total = 100 // 假设总数据量为100
  } catch (error) {
    console.error('Fetch users failed:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.value.current = 1
  fetchUsers()
}

const resetSearch = () => {
  searchQuery.value = ''
  pagination.value.current = 1
  fetchUsers()
}

const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  fetchUsers()
}

const handleCurrentChange = (current: number) => {
  pagination.value.current = current
  fetchUsers()
}

const navigateToCreate = () => {
  router.push('/users/create')
}

const handleEdit = (user: any) => {
  router.push(`/users/create?id=${user.id}`)
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个用户吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await axios.delete(`/api/admin/users/${id}`)
    
    ElMessage.success('删除用户成功')
    fetchUsers()
  } catch (error) {
    console.error('Delete user failed:', error)
    if (error !== 'cancel') {
      ElMessage.error('删除用户失败')
    }
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-list-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-bar {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
