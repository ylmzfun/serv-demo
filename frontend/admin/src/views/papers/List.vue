<template>
  <div class="paper-list-container">
    <h2>试卷管理</h2>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>试卷列表</span>
          <el-button type="primary" @click="navigateToCreate">创建试卷</el-button>
        </div>
      </template>
      <div class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索试卷名称"
          style="width: 300px; margin-right: 10px;"
          prefix-icon="Search"
        >
        </el-input>
        <el-select
          v-model="paperStatus"
          placeholder="试卷状态"
          style="width: 150px; margin-right: 10px;"
        >
          <el-option label="全部" value=""></el-option>
          <el-option label="未发布" value="draft"></el-option>
          <el-option label="已发布" value="published"></el-option>
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>
      <el-table :data="papers" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="试卷名称" />
        <el-table-column prop="total_questions" label="题目数量" width="120" />
        <el-table-column prop="total_score" label="总分" width="80" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'published' ? 'success' : 'info'">
              {{ scope.row.status === 'published' ? '已发布' : '未发布' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" />
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleEdit(scope.row)">
              编辑
            </el-button>
            <el-button
              :type="scope.row.status === 'published' ? 'warning' : 'success'"
              size="small"
              @click="handlePublish(scope.row)"
            >
              {{ scope.row.status === 'published' ? '撤销发布' : '发布' }}
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
const papers = ref([])
const loading = ref(false)
const searchQuery = ref('')
const paperStatus = ref('')
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

const fetchPapers = async () => {
  loading.value = true
  try {
    const data = await axios.get('/api/admin/papers', {
      params: {
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
        query: searchQuery.value,
        status: paperStatus.value
      }
    })
    
    papers.value = data
    pagination.value.total = 100 // 假设总数据量为100
  } catch (error) {
    console.error('Fetch papers failed:', error)
    ElMessage.error('获取试卷列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.value.current = 1
  fetchPapers()
}

const resetSearch = () => {
  searchQuery.value = ''
  paperStatus.value = ''
  pagination.value.current = 1
  fetchPapers()
}

const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  fetchPapers()
}

const handleCurrentChange = (current: number) => {
  pagination.value.current = current
  fetchPapers()
}

const navigateToCreate = () => {
  router.push('/papers/create')
}

const handleEdit = (paper: any) => {
  router.push(`/papers/create?id=${paper.id}`)
}

const handlePublish = async (paper: any) => {
  try {
    await axios.post(`/api/admin/papers/${paper.id}/publish`, {
      published: paper.status !== 'published'
    })
    
    ElMessage.success(paper.status === 'published' ? '撤销发布成功' : '发布成功')
    fetchPapers()
  } catch (error) {
    console.error('Publish paper failed:', error)
    ElMessage.error('操作失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个试卷吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await axios.delete(`/api/admin/papers/${id}`)
    
    ElMessage.success('删除试卷成功')
    fetchPapers()
  } catch (error) {
    console.error('Delete paper failed:', error)
    if (error !== 'cancel') {
      ElMessage.error('删除试卷失败')
    }
  }
}

onMounted(() => {
  fetchPapers()
})
</script>

<style scoped>
.paper-list-container {
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
