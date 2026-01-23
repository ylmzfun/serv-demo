<template>
  <div class="score-analysis">
    <h1>成绩分析</h1>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>考试成绩分析</span>
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
      <div class="analysis-result" v-if="analysisData">
        <h2>{{ analysisData.exam_name }} 成绩分析</h2>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>参考人数</span>
                </div>
              </template>
              <div class="stat-value">{{ analysisData.total_students }}</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>平均分</span>
                </div>
              </template>
              <div class="stat-value">{{ analysisData.average_score }}</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>最高分</span>
                </div>
              </template>
              <div class="stat-value">{{ analysisData.highest_score }}</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>最低分</span>
                </div>
              </template>
              <div class="stat-value">{{ analysisData.lowest_score }}</div>
            </el-card>
          </el-col>
        </el-row>
        <div class="chart-container" style="margin-top: 20px">
          <h3>分数分布</h3>
          <div id="scoreChart" style="width: 100%; height: 400px;"></div>
        </div>
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

interface AnalysisData {
  exam_name: string
  total_students: number
  average_score: number
  highest_score: number
  lowest_score: number
  score_distribution: any[]
}

const form = reactive({
  exam_id: 0
})

const exams = ref<Exam[]>([])
const analysisData = ref<AnalysisData | null>(null)

onMounted(async () => {
  await loadExams()
  if (exams.value.length > 0) {
    form.exam_id = exams.value[0].id
    await loadData()
  }
})

async function loadExams() {
  try {
    const response = await axios.get('/api/admin/exams')
    exams.value = response.data
  } catch (error) {
    console.error('加载考试列表失败:', error)
  }
}

async function loadData() {
  if (!form.exam_id) return

  try {
    const response = await axios.get(`/api/admin/scores/analysis/${form.exam_id}`)
    analysisData.value = response.data
    renderChart()
  } catch (error) {
    console.error('加载成绩分析失败:', error)
  }
}

function renderChart() {
  // 这里可以集成 ECharts 等图表库来渲染分数分布图表
  console.log('Render chart with data:', analysisData.value)
}
</script>

<style scoped>
.score-analysis {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.analysis-result {
  margin-top: 20px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin-top: 10px;
}

.chart-container {
  margin-top: 20px;
}
</style>
