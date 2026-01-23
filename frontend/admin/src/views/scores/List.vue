<template>
  <div class="score-list">
    <h1>成绩管理</h1>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>成绩列表</span>
        </div>
      </template>
      <el-form :model="form" label-width="100px">
        <el-form-item label="选择考试">
          <el-select v-model="form.exam_id" placeholder="请选择考试">
            <el-option
              v-for="exam in exams"
              :key="exam.id"
              :label="exam.name"
              :value="exam.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="scoreList" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="user_name" label="用户名" />
        <el-table-column prop="score" label="分数" width="120">
          <template #default="scope">
            <el-tag :type="getScoreTagType(scope.row.score)">
              {{ scope.row.score }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="180" />
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleView(scope.row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination" v-if="total > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import axios from '../../utils/axios'

interface Exam {
  id: number
  name: string
}

interface Score {
  id: number
  user_name: string
  score: number
  submit_time: string
}

const form = reactive({
  exam_id: 0
})

const exams = ref<Exam[]>([])
const scoreList = ref<Score[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

onMounted(async () => {
  await loadExams()
  if (exams.value.length > 0) {
    form.exam_id = exams.value[0].id
    await loadData()
  }
})

async function loadExams() {
  try {
    const data = await axios.get('/api/admin/exams')
    exams.value = data
  } catch (error) {
    console.error('加载考试列表失败:', error)
  }
}

async function loadData() {
  try {
    const data = await axios.get('/api/admin/scores', {
      params: {
        exam_id: form.exam_id,
        page: currentPage.value,
        page_size: pageSize.value
      }
    })
    scoreList.value = data
    total.value = 100 // 假设总数据量为100
  } catch (error) {
    console.error('加载成绩列表失败:', error)
  }
}

function handleSizeChange(size: number) {
  pageSize.value = size
  loadData()
}

function handleCurrentChange(page: number) {
  currentPage.value = page
  loadData()
}

function handleView(score: Score) {
  console.log('View score:', score)
  // 这里可以跳转到成绩详情页面
}

function getScoreTagType(score: number): string {
  if (score >= 90) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}
</script>

<style scoped>
.score-list {
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
