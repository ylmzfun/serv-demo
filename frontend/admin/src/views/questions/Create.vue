<template>
  <div class="question-create-container">
    <h2>{{ isEdit ? '编辑题目' : '创建题目' }}</h2>
    <el-card shadow="hover">
      <el-form :model="questionForm" :rules="rules" ref="questionFormRef" label-width="100px">
        <el-form-item label="题目类型" prop="type">
          <el-select v-model="questionForm.type" placeholder="请选择题目类型">
            <el-option label="单选题" value="single_choice"></el-option>
            <el-option label="多选题" value="multiple_choice"></el-option>
            <el-option label="判断题" value="true_false"></el-option>
            <el-option label="填空题" value="fill_blank"></el-option>
            <el-option label="简答题" value="short_answer"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="题目内容" prop="content">
          <el-input
            v-model="questionForm.content"
            type="textarea"
            :rows="3"
            placeholder="请输入题目内容"
          ></el-input>
        </el-form-item>
        <el-form-item label="选项" prop="options" v-if="['single_choice', 'multiple_choice'].includes(questionForm.type)">
          <div v-for="(option, index) in questionForm.options" :key="index" class="option-item">
            <el-input
              v-model="option.text"
              placeholder="请输入选项内容"
              style="width: 80%; margin-right: 10px;"
            ></el-input>
            <el-checkbox v-model="option.correct" label="正确">正确</el-checkbox>
            <el-button type="danger" size="small" @click="removeOption(index)" v-if="questionForm.options.length > 2">
              删除
            </el-button>
          </div>
          <el-button type="primary" size="small" @click="addOption" style="margin-top: 10px;">
            添加选项
          </el-button>
        </el-form-item>
        <el-form-item label="答案" prop="answer" v-if="['true_false', 'fill_blank', 'short_answer'].includes(questionForm.type)">
          <el-input
            v-model="questionForm.answer"
            :type="questionForm.type === 'true_false' ? 'select' : 'textarea'"
            :rows="questionForm.type === 'short_answer' ? 3 : 1"
            placeholder="请输入答案"
          >
            <template v-if="questionForm.type === 'true_false'" #prefix>
              <el-select v-model="questionForm.answer" placeholder="请选择答案" style="width: 100%;">
                <el-option label="正确" value="true"></el-option>
                <el-option label="错误" value="false"></el-option>
              </el-select>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="分值" prop="score">
          <el-input-number v-model="questionForm.score" :min="1" :max="100" :step="1" placeholder="请输入分值"></el-input-number>
        </el-form-item>
        <el-form-item label="难度" prop="difficulty">
          <el-select v-model="questionForm.difficulty" placeholder="请选择难度">
            <el-option label="简单" value="easy"></el-option>
            <el-option label="中等" value="medium"></el-option>
            <el-option label="困难" value="hard"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="解析" prop="analysis">
          <el-input
            v-model="questionForm.analysis"
            type="textarea"
            :rows="2"
            placeholder="请输入题目解析"
          ></el-input>
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from '../../utils/axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const questionFormRef = ref()
const loading = ref(false)
const questionId = computed(() => route.query.id as string)
const isEdit = computed(() => !!questionId.value)

const questionForm = reactive({
  type: 'single_choice',
  content: '',
  options: [
    { text: '', correct: false },
    { text: '', correct: false }
  ],
  answer: '',
  score: 5,
  difficulty: 'medium',
  analysis: ''
})

const validateOptions = (_rule: any, value: any, callback: any) => {
  if (!value || value.length < 2) {
    callback(new Error('至少需要两个选项'))
  } else {
    const hasCorrect = value.some((option: any) => option.correct)
    if (!hasCorrect) {
      callback(new Error('至少需要一个正确选项'))
    } else {
      callback()
    }
  }
}

const rules = {
  type: [
    { required: true, message: '请选择题目类型', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入题目内容', trigger: 'blur' }
  ],
  options: [
    { required: true, message: '请输入选项内容', trigger: 'blur', validator: validateOptions }
  ],
  answer: [
    { required: true, message: '请输入答案', trigger: 'blur' }
  ],
  score: [
    { required: true, message: '请输入分值', trigger: 'blur' }
  ],
  difficulty: [
    { required: true, message: '请选择难度', trigger: 'blur' }
  ]
}

const addOption = () => {
  questionForm.options.push({ text: '', correct: false })
}

const removeOption = (index: number) => {
  questionForm.options.splice(index, 1)
}

const fetchQuestionInfo = async () => {
  if (!isEdit.value) return
  
  try {
    const question = await axios.get(`/api/admin/questions/${questionId.value}`)
    
    questionForm.type = question.type
    questionForm.content = question.content
    questionForm.options = question.options || []
    questionForm.answer = question.answer
    questionForm.score = question.score
    questionForm.difficulty = question.difficulty
    questionForm.analysis = question.analysis
  } catch (error) {
    console.error('Fetch question info failed:', error)
    ElMessage.error('获取题目信息失败')
  }
}

const handleSubmit = async () => {
  if (!questionFormRef.value) return
  
  const valid = await questionFormRef.value.validate()
  if (!valid) return
  
  loading.value = true
  
  try {
    const formData = {
      ...questionForm,
      options: questionForm.options.map((option: any) => option.text),
      answer: questionForm.type === 'multiple_choice' 
        ? questionForm.options.filter((option: any) => option.correct).map((option: any) => option.text).join(',')
        : questionForm.type === 'single_choice'
          ? questionForm.options.find((option: any) => option.correct)?.text || ''
          : questionForm.answer
    }
    
    if (isEdit.value) {
      // 编辑题目
      await axios.patch(`/api/admin/questions/${questionId.value}`, formData)
    } else {
      // 创建题目
      await axios.post('/api/admin/questions', formData)
    }
    
    ElMessage.success(isEdit.value ? '编辑题目成功' : '创建题目成功')
    router.push('/questions/list')
  } catch (error) {
    console.error(isEdit.value ? 'Edit question failed:' : 'Create question failed:', error)
    ElMessage.error(isEdit.value ? '编辑题目失败' : '创建题目失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  router.push('/questions/list')
}

// 监听题目类型变化，重置相关字段
watch(() => questionForm.type, (newType) => {
  if (['single_choice', 'multiple_choice'].includes(newType)) {
    questionForm.options = [
      { text: '', correct: false },
      { text: '', correct: false }
    ]
    questionForm.answer = ''
  } else if (newType === 'true_false') {
    questionForm.options = []
    questionForm.answer = 'true'
  } else {
    questionForm.options = []
    questionForm.answer = ''
  }
})

onMounted(() => {
  fetchQuestionInfo()
})
</script>

<style scoped>
.question-create-container {
  padding: 0;
}

.option-item {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}
</style>
