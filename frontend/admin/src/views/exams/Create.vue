<template>
  <div class="exam-create">
    <h1>创建考试</h1>
    <el-form :model="examForm" label-width="100px">
      <el-form-item label="考试名称">
        <el-input v-model="examForm.name" placeholder="请输入考试名称" />
      </el-form-item>
      <el-form-item label="选择试卷">
        <el-select v-model="examForm.paper_id" placeholder="请选择试卷">
          <el-option
            v-for="paper in papers"
            :key="paper.id"
            :label="paper.name"
            :value="paper.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="考试时间">
        <el-date-picker
          v-model="examForm.start_time"
          type="datetime"
          placeholder="选择开始时间"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="结束时间">
        <el-date-picker
          v-model="examForm.end_time"
          type="datetime"
          placeholder="选择结束时间"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="考试时长">
        <el-input v-model="examForm.duration" type="number" placeholder="请输入考试时长（分钟）" />
      </el-form-item>
      <el-form-item label="考试状态">
        <el-radio-group v-model="examForm.status">
          <el-radio label="active">启用</el-radio>
          <el-radio label="inactive">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submitForm">创建考试</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../../utils/axios'

interface Paper {
  id: number
  name: string
}

interface ExamForm {
  name: string
  paper_id: number
  start_time: string
  end_time: string
  duration: number
  status: string
}

const router = useRouter()
const papers = ref<Paper[]>([])
const examForm = reactive<ExamForm>({
  name: '',
  paper_id: 0,
  start_time: '',
  end_time: '',
  duration: 0,
  status: 'active'
})

onMounted(async () => {
  await loadPapers()
})

async function loadPapers() {
  try {
    const data = await axios.get('/api/admin/papers')
    papers.value = data
  } catch (error) {
    console.error('加载试卷失败:', error)
  }
}

async function submitForm() {
  try {
    await axios.post('/api/admin/exams', examForm)
    router.push('/exams/list')
  } catch (error) {
    console.error('创建考试失败:', error)
  }
}

function resetForm() {
  Object.assign(examForm, {
    name: '',
    paper_id: 0,
    start_time: '',
    end_time: '',
    duration: 0,
    status: 'active'
  })
}
</script>

<style scoped>
.exam-create {
  max-width: 800px;
  margin: 0 auto;
}

.el-form {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.el-form-item {
  margin-bottom: 20px;
}
</style>
