<template>
  <div class="paper-create-container">
    <h2>{{ isEdit ? '编辑试卷' : '创建试卷' }}</h2>
    <el-card shadow="hover">
      <el-form :model="paperForm" :rules="rules" ref="paperFormRef" label-width="100px">
        <el-form-item label="试卷名称" prop="name">
          <el-input v-model="paperForm.name" placeholder="请输入试卷名称"></el-input>
        </el-form-item>
        <el-form-item label="试卷描述" prop="description">
          <el-input
            v-model="paperForm.description"
            type="textarea"
            :rows="2"
            placeholder="请输入试卷描述"
          ></el-input>
        </el-form-item>
        <el-form-item label="题目选择方式" prop="question_selection">
          <el-radio-group v-model="paperForm.question_selection">
            <el-radio label="manual">手动选择</el-radio>
            <el-radio label="auto">自动生成</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="手动选择题目" v-if="paperForm.question_selection === 'manual'">
          <el-button type="primary" @click="openQuestionSelector">选择题目</el-button>
          <el-table :data="selectedQuestions" style="width: 100%; margin-top: 10px;">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="type" label="类型" width="120">
              <template #default="scope">
                {{ getQuestionTypeText(scope.row.type) }}
              </template>
            </el-table-column>
            <el-table-column prop="content" label="题目内容" />
            <el-table-column prop="score" label="分值" width="80" />
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button type="danger" size="small" @click="removeQuestion(scope.row.id)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
        <el-form-item label="自动生成设置" v-if="paperForm.question_selection === 'auto'">
          <div v-for="type in questionTypes" :key="type.value" class="question-type-setting">
            <el-form-item :label="type.label" :prop="`question_counts.${type.value}`">
              <el-input-number
                v-model="paperForm.question_counts[type.value]"
                :min="0"
                :max="100"
                :step="1"
                placeholder="请输入题目数量"
              ></el-input-number>
              <el-input-number
                v-model="paperForm.question_scores[type.value]"
                :min="1"
                :max="10"
                :step="1"
                placeholder="分值"
                style="margin-left: 10px;"
              ></el-input-number>
            </el-form-item>
          </div>
        </el-form-item>
        <el-form-item label="总分" prop="total_score">
          <el-input-number v-model="paperForm.total_score" :min="1" :max="1000" :step="1" placeholder="请输入总分"></el-input-number>
        </el-form-item>
        <el-form-item label="时间限制" prop="time_limit">
          <el-input-number v-model="paperForm.time_limit" :min="1" :max="360" :step="1" placeholder="请输入时间限制（分钟）"></el-input-number>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">保存</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 题目选择对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="选择题目"
      width="80%"
    >
      <div class="dialog-search-bar">
        <el-input
          v-model="dialogSearchQuery"
          placeholder="搜索题目内容"
          style="width: 300px; margin-right: 10px;"
          prefix-icon="Search"
        >
        </el-input>
        <el-select
          v-model="dialogQuestionType"
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
        <el-button type="primary" @click="handleDialogSearch">搜索</el-button>
      </div>
      <el-table :data="dialogQuestions" style="width: 100%" v-loading="dialogLoading">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="scope">
            {{ getQuestionTypeText(scope.row.type) }}
          </template>
        </el-table-column>
        <el-table-column prop="content" label="题目内容" />
        <el-table-column prop="score" label="分值" width="80" />
      </el-table>
      <div class="dialog-pagination">
        <el-pagination
          v-model:current-page="dialogPagination.current"
          v-model:page-size="dialogPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="dialogPagination.total"
          @size-change="handleDialogSizeChange"
          @current-change="handleDialogCurrentChange"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmQuestionSelection">确定选择</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from '../../utils/axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const paperFormRef = ref()
const loading = ref(false)
const paperId = computed(() => route.query.id as string)
const isEdit = computed(() => !!paperId.value)

interface QuestionCounts {
  [key: string]: number
  single_choice: number
  multiple_choice: number
  true_false: number
  fill_blank: number
  short_answer: number
}

interface QuestionScores {
  [key: string]: number
  single_choice: number
  multiple_choice: number
  true_false: number
  fill_blank: number
  short_answer: number
}

const paperForm = reactive({
  name: '',
  description: '',
  question_selection: 'manual',
  question_counts: {
    single_choice: 0,
    multiple_choice: 0,
    true_false: 0,
    fill_blank: 0,
    short_answer: 0
  } as QuestionCounts,
  question_scores: {
    single_choice: 5,
    multiple_choice: 10,
    true_false: 2,
    fill_blank: 5,
    short_answer: 10
  } as QuestionScores,
  total_score: 100,
  time_limit: 60,
  questions: []
})

const rules = {
  name: [
    { required: true, message: '请输入试卷名称', trigger: 'blur' }
  ],
  total_score: [
    { required: true, message: '请输入总分', trigger: 'blur' }
  ],
  time_limit: [
    { required: true, message: '请输入时间限制', trigger: 'blur' }
  ]
}

const selectedQuestions = ref([])
const questionTypes = [
  { label: '单选题', value: 'single_choice' },
  { label: '多选题', value: 'multiple_choice' },
  { label: '判断题', value: 'true_false' },
  { label: '填空题', value: 'fill_blank' },
  { label: '简答题', value: 'short_answer' }
]

// 题目选择对话框相关
const dialogVisible = ref(false)
const dialogQuestions = ref([])
const dialogLoading = ref(false)
const dialogSearchQuery = ref('')
const dialogQuestionType = ref('')
const dialogPagination = ref({
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

const fetchPaperInfo = async () => {
  if (!isEdit.value) return
  
  try {
    const paper = await axios.get(`/api/admin/papers/${paperId.value}`)
    
    paperForm.name = paper.name
    paperForm.description = paper.description
    paperForm.question_selection = paper.question_selection
    paperForm.question_counts = paper.question_counts || paperForm.question_counts
    paperForm.question_scores = paper.question_scores || paperForm.question_scores
    paperForm.total_score = paper.total_score
    paperForm.time_limit = paper.time_limit
    paperForm.questions = paper.questions || []
    selectedQuestions.value = paper.questions || []
  } catch (error) {
    console.error('Fetch paper info failed:', error)
    ElMessage.error('获取试卷信息失败')
  }
}

const openQuestionSelector = () => {
  fetchDialogQuestions()
  dialogVisible.value = true
}

const fetchDialogQuestions = async () => {
  dialogLoading.value = true
  try {
    const data = await axios.get('/api/admin/questions', {
      params: {
        page: dialogPagination.value.current,
        pageSize: dialogPagination.value.pageSize,
        query: dialogSearchQuery.value,
        type: dialogQuestionType.value
      }
    })
    
    dialogQuestions.value = data
    dialogPagination.value.total = 100 // 假设总数据量为100
  } catch (error) {
    console.error('Fetch dialog questions failed:', error)
    ElMessage.error('获取题目列表失败')
  } finally {
    dialogLoading.value = false
  }
}

const handleDialogSearch = () => {
  dialogPagination.value.current = 1
  fetchDialogQuestions()
}

const handleDialogSizeChange = (size: number) => {
  dialogPagination.value.pageSize = size
  fetchDialogQuestions()
}

const handleDialogCurrentChange = (current: number) => {
  dialogPagination.value.current = current
  fetchDialogQuestions()
}

const confirmQuestionSelection = () => {
  // 这里需要获取选中的题目
  // 为了演示，我们假设已经选中了一些题目
  dialogVisible.value = false
}

const removeQuestion = (id: number) => {
  const index = selectedQuestions.value.findIndex((q: any) => q.id === id)
  if (index > -1) {
    selectedQuestions.value.splice(index, 1)
  }
}

const handleSubmit = async () => {
  if (!paperFormRef.value) return
  
  const valid = await paperFormRef.value.validate()
  if (!valid) return
  
  loading.value = true
  
  try {
    const formData = {
      ...paperForm,
      questions: selectedQuestions.value.map((q: any) => q.id)
    }
    
    if (isEdit.value) {
      // 编辑试卷
      await axios.patch(`/api/admin/papers/${paperId.value}`, formData)
    } else {
      // 创建试卷
      await axios.post('/api/admin/papers', formData)
    }
    
    ElMessage.success(isEdit.value ? '编辑试卷成功' : '创建试卷成功')
    router.push('/papers/list')
  } catch (error) {
    console.error(isEdit.value ? 'Edit paper failed:' : 'Create paper failed:', error)
    ElMessage.error(isEdit.value ? '编辑试卷失败' : '创建试卷失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  router.push('/papers/list')
}

onMounted(() => {
  fetchPaperInfo()
})
</script>

<style scoped>
.paper-create-container {
  padding: 0;
}

.question-type-setting {
  margin-bottom: 10px;
}

.dialog-search-bar {
  margin-bottom: 20px;
}

.dialog-pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
