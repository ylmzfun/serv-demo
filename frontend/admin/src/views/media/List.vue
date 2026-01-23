<template>
  <div class="media-list">
    <h1>媒体管理</h1>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>媒体列表</span>
          <el-button type="primary" @click="handleUpload">上传媒体</el-button>
        </div>
      </template>
      <el-table :data="mediaList" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="文件名" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="scope">
            <el-tag :type="getTypeTagType(scope.row.type)">
              {{ scope.row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="size" label="大小" width="120">
          <template #default="scope">
            {{ formatSize(scope.row.size) }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="上传时间" width="180" />
        <el-table-column label="操作" width="120">
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../../utils/axios'

interface Media {
  id: number
  name: string
  type: string
  size: number
  created_at: string
  url: string
}

const router = useRouter()
const mediaList = ref<Media[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

onMounted(async () => {
  await loadMediaList()
})

async function loadMediaList() {
  try {
    const data = await axios.get('/api/admin/media', {
      params: {
        page: currentPage.value,
        page_size: pageSize.value
      }
    })
    mediaList.value = data
    total.value = 100 // 假设总数据量为100
  } catch (error) {
    console.error('加载媒体列表失败:', error)
  }
}

function handleSizeChange(size: number) {
  pageSize.value = size
  loadMediaList()
}

function handleCurrentChange(page: number) {
  currentPage.value = page
  loadMediaList()
}

function handleUpload() {
  router.push('/media/upload')
}

function handleView(media: Media) {
  window.open(media.url, '_blank')
}

async function handleDelete(id: number) {
  try {
    await axios.delete(`/api/admin/media/${id}`)
    loadMediaList()
  } catch (error) {
    console.error('删除媒体失败:', error)
  }
}

function getTypeTagType(type: string): string {
  if (type.includes('image')) return 'success'
  if (type.includes('audio')) return 'warning'
  if (type.includes('video')) return 'danger'
  return 'info'
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.media-list {
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
