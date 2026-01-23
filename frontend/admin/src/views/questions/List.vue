<template>
  <div class="question-list-container">
    <h2>题目管理</h2>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>题目列表</span>
          <el-button type="primary" @click="navigateToCreate">创建题目</el-button>
        </div>
      </template>
      <div class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索题目内容"
          style="width: 300px; margin-right: 10px;"
          prefix-icon="Search"
        >
        </el-input>
        <el-select
          v-model="questionType"
          placeholder="题目类型"
          style="width: 150px; margin-right: 10px;"
        >
          <el-option label="全部" value=""></el-option>
          <el-option label="单选题" value="single_choice"></el-option>
          <el-option label="多选题" value="multiple_choice"></el-option>
          <el-option label="判断题" value="true_false"></el-option>
          <el-option label="填空题" value="fill_blank"></el-option>
          <el-option label="简答题" value="short_answer"></el-option>
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>
      <el-table :data="questions" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="scope">
            {{ getQuestionTypeText(scope.row.type) }}
          </template>
        </el-table-column>
        <el-table-column prop="content" label="题目内容" />
        <el-table-column prop="score" label="分值" width="80" />
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
const questions = ref([])
const loading = ref(false)
const searchQuery = ref('')
const questionType = ref('')
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

const getQuestionTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    'single_choice': '单选题',
    'multiple_choice': '多选题',
    'true_false': '判断题',
    'fill_blank': '填空题',
    'short_answer': '简答题'
  }
  return typeMap[type] || type
}

const fetchQuestions = async () => {
  loading.value = true
  try {
    const data = await axios.get('/api/admin/questions', {
      params: {
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
        query: searchQuery.value,
        type: questionType.value
      }
    })
    
    questions.value = data
    pagination.value.total = 100 // 假设总数据量为100
  } catch (error) {
    console.error('Fetch questions failed:', error)
    ElMessage.error('获取题目列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.value.current = 1
  fetchQuestions()
}

const resetSearch = () => {
  searchQuery.value = ''
  questionType.value = ''
  pagination.value.current = 1
  fetchQuestions()
}

const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  fetchQuestions()
}

const handleCurrentChange = (current: number) => {
  pagination.value.current = current
  fetchQuestions()
}

const navigateToCreate = () => {
  router.push('/questions/create')
}

const handleEdit = (question: any) => {
  router.push(`/questions/create?id=${question.id}`)
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个题目吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await axios.delete(`/api/admin/questions/${id}`)
    
    ElMessage.success('删除题目成功')
    fetchQuestions()
  } catch (error) {
    console.error('Delete question failed:', error)
    if (error !== 'cancel') {
      ElMessage.error('删除题目失败')
    }
  }
}

onMounted(() => {
  fetchQuestions()
})
</script>

<style scoped>
.question-list-container {
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
