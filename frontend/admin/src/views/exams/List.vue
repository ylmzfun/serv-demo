<template>
  <div class="exam-list">
    <h1>考试管理</h1>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>考试列表</span>
          <el-button type="primary" @click="router.push('/exams/create')">创建考试</el-button>
        </div>
      </template>
      <el-table :data="examList" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="考试名称" />
        <el-table-column prop="paper_name" label="试卷名称" />
        <el-table-column prop="start_time" label="开始时间" width="180" />
        <el-table-column prop="end_time" label="结束时间" width="180" />
        <el-table-column prop="duration" label="考试时长" width="120">
          <template #default="scope">
            {{ scope.row.duration }} 分钟
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleView(scope.row)">
              查看
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination" v-if="pagination.total > 0">
        <el-pagination
          v-model:current-page="pagination.currentPage"
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
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../../utils/axios'

interface Exam {
  id: number
  name: string
  paper_name: string
  start_time: string
  end_time: string
  duration: number
  status: string
}

interface Pagination {
  currentPage: number
  pageSize: number
  total: number
}

const router = useRouter()
const examList = ref<Exam[]>([])
const pagination = reactive<Pagination>({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

onMounted(async () => {
  await loadExams()
})

async function loadExams() {
  try {
    const data = await axios.get('/api/admin/exams', {
      params: {
        page: pagination.currentPage,
        page_size: pagination.pageSize
      }
    })
    examList.value = data
    pagination.total = 100 // 假设总数据量为100
  } catch (error) {
    console.error('加载考试列表失败:', error)
  }
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.currentPage = 1
  loadExams()
}

function handleCurrentChange(page: number) {
  pagination.currentPage = page
  loadExams()
}

function handleView(exam: Exam) {
  console.log('View exam:', exam)
  // 这里可以跳转到考试详情页面
}

async function handleDelete(id: number) {
  try {
    await axios.delete(`/api/admin/exams/${id}`)
    loadExams()
  } catch (error) {
    console.error('删除考试失败:', error)
  }
}

function getStatusTagType(status: string): string {
  if (status === 'active') return 'success'
  if (status === 'inactive') return 'warning'
  return 'info'
}
</script>

<style scoped>
.exam-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
