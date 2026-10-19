<script setup>
// 其他附件：圖片與 pdf 皆站內預覽（規格 6.1）。
// 附件為 API 的 { fileName, fileUrl }；fileUrl 取得失敗（null）時不可點
import { Document, Picture } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import AppDialog from '../AppDialog.vue'

const props = defineProps({
  attachments: { type: Array, required: true },
})

const isPdf = (file) => /\.pdf$/i.test(file.fileName)
const imageUrls = computed(() => props.attachments.filter((f) => !isPdf(f) && f.fileUrl).map((f) => f.fileUrl))

const imageIndex = ref(-1)
const pdfFile = ref(null)
const pdfVisible = ref(false)

function preview(file) {
  if (isPdf(file)) {
    pdfFile.value = file
    pdfVisible.value = true
  } else {
    imageIndex.value = imageUrls.value.indexOf(file.fileUrl)
  }
}
</script>

<template>
  <ul class="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap">
    <li v-for="(file, index) in attachments" :key="index">
      <button
        type="button"
        class="flex w-full flex-col overflow-hidden rounded-xl border border-line bg-white text-left disabled:cursor-not-allowed disabled:opacity-50 sm:w-40"
        :disabled="!file.fileUrl"
        @click="preview(file)"
      >
        <span class="flex h-[120px] items-center justify-center bg-page">
          <span class="file-icon" :class="isPdf(file) ? 'bg-[#ff6c68]' : 'bg-[#50a1ff]'">
            <el-icon :size="22"><Document v-if="isPdf(file)" /><Picture v-else /></el-icon>
          </span>
        </span>
        <span class="truncate p-3 text-sm text-ink">{{ file.fileName }}</span>
      </button>
    </li>
  </ul>

  <el-image-viewer
    v-if="imageIndex >= 0"
    :url-list="imageUrls"
    :initial-index="imageIndex"
    hide-on-click-modal
    @close="imageIndex = -1"
  />

  <AppDialog v-if="pdfFile" v-model="pdfVisible" :title="pdfFile.fileName" width="min(960px, calc(100vw - 40px))">
    <iframe :src="pdfFile.fileUrl" :title="pdfFile.fileName" class="h-[70vh] w-full border-0" />
  </AppDialog>
</template>

<style scoped>
.file-icon {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #fff;
}
</style>
