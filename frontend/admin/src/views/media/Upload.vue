<template>
  <div class="media-upload">
    <h1>上传媒体</h1>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>上传文件</span>
        </div>
      </template>
      <el-upload
        class="upload-demo"
        action="/api/admin/media/upload"
        :on-success="handleSuccess"
        :on-error="handleError"
        :limit="1"
        :on-exceed="handleExceed"
        :file-list="fileList"
        :auto-upload="false"
        ref="uploadRef"
      >
        <el-button type="primary">
          点击上传
        </el-button>
        <template #tip>
          <div class="el-upload__tip">
            只能上传单个文件，支持 JPG、PNG、GIF、MP4、MP3 等格式
          </div>
        </template>
      </el-upload>
      <el-button type="primary" @click="submitForm" v-if="fileList.length > 0">
        提交
      </el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const fileList = ref<any[]>([])
const uploadRef = ref<any>(null)

function handleSuccess() {
  router.push('/media/list')
}

function handleError(error: any) {
  console.error('上传失败:', error)
}

function handleExceed() {
  alert('只能上传单个文件')
}

function submitForm() {
  if (fileList.value.length === 0) {
    alert('请选择文件')
    return
  }

  uploadRef.value?.submit()
}
</script>

<style scoped>
.media-upload {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-demo {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  padding: 20px;
  text-align: center;
  margin-bottom: 20px;
}
</style>
