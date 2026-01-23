<template>
  <div class="dashboard-container">
    <h2>仪表盘</h2>
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon user-icon">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.users }}</div>
              <div class="stat-label">用户数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon question-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.questions }}</div>
              <div class="stat-label">题目数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon paper-icon">
              <el-icon><Reading /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.papers }}</div>
              <div class="stat-label">试卷数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon exam-icon">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.exams }}</div>
              <div class="stat-label">考试数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>最近考试</span>
            </div>
          </template>
          <el-table :data="recentExams" style="width: 100%">
            <el-table-column prop="name" label="考试名称" width="180" />
            <el-table-column prop="startTime" label="开始时间" />
            <el-table-column prop="endTime" label="结束时间" />
            <el-table-column prop="status" label="状态" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>系统概览</span>
            </div>
          </template>
          <div class="overview-content">
            <el-descriptions :column="2">
              <el-descriptions-item label="系统版本">v1.0.0</el-descriptions-item>
              <el-descriptions-item label="后端服务">运行中</el-descriptions-item>
              <el-descriptions-item label="数据库状态">正常</el-descriptions-item>
              <el-descriptions-item label="Redis状态">{{ redisStatus }}</el-descriptions-item>
              <el-descriptions-item label="在线用户">0</el-descriptions-item>
              <el-descriptions-item label="今日访问">0</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { User, Document, Reading, Timer } from '@element-plus/icons-vue'

const stats = ref({
  users: 0,
  questions: 0,
  papers: 0,
  exams: 0
})

const recentExams = ref([
  {
    name: '期中考试',
    startTime: '2026-01-20 09:00',
    endTime: '2026-01-20 11:00',
    status: '已结束'
  },
  {
    name: '期末考试',
    startTime: '2026-01-25 09:00',
    endTime: '2026-01-25 11:30',
    status: '未开始'
  }
])

const redisStatus = ref('未连接')

const fetchStats = () => {
  // 模拟数据
  stats.value = {
    users: 100,
    questions: 500,
    papers: 50,
    exams: 20
  }
  
  redisStatus.value = '未连接'
}

onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.dashboard-container {
  padding: 0;
}

.stat-card {
  height: 120px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 20px;
  font-size: 24px;
}

.user-icon {
  background-color: rgba(64, 158, 255, 0.1);
  color: #409EFF;
}

.question-icon {
  background-color: rgba(103, 194, 58, 0.1);
  color: #67C23A;
}

.paper-icon {
  background-color: rgba(230, 162, 60, 0.1);
  color: #E6A23C;
}

.exam-icon {
  background-color: rgba(245, 108, 108, 0.1);
  color: #F56C6C;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.overview-content {
  padding: 10px 0;
}
</style>
