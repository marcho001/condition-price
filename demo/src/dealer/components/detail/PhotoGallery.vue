<script setup>
// 車輛照片：主圖＋左右切換＋縮圖列，點主圖可放大（規格 6.1）。
// 無照片時區塊仍呈現，以 empty UI 說明（不擋出價）。
// 照片為 API 的附件 { fileName, fileUrl }；fileUrl 取得失敗（null）時以車輛示意圖代替
import { ArrowLeft, ArrowRight, InfoFilled } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import carPlaceholder from '@/assets/car-placeholder.svg'

const props = defineProps({
  photos: { type: Array, default: () => [] },
})

const current = ref(0)
const viewerVisible = ref(false)
const urls = computed(() => props.photos.map((photo) => photo.fileUrl ?? carPlaceholder))

function go(step) {
  const n = props.photos.length
  current.value = (current.value + step + n) % n
}
</script>

<template>
  <div v-if="photos.length" class="flex flex-col gap-2 md:gap-4">
    <div class="relative aspect-[776/450] overflow-hidden rounded-xl bg-page md:rounded-2xl">
      <img
        :src="urls[current]"
        :alt="photos[current].fileName"
        class="size-full cursor-zoom-in object-cover"
        @click="viewerVisible = true"
      />
      <div class="absolute top-4 left-4 flex gap-2"><slot name="badges" /></div>
      <template v-if="photos.length > 1">
        <button type="button" class="nav-btn left-4" @click="go(-1)"><el-icon><ArrowLeft /></el-icon></button>
        <button type="button" class="nav-btn right-4" @click="go(1)"><el-icon><ArrowRight /></el-icon></button>
      </template>
      <span class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-1 text-sm font-medium text-white">
        {{ $t('detail.photoCount', { i: current + 1, n: photos.length }) }}
      </span>
    </div>

    <div class="flex gap-2 overflow-x-auto">
      <button
        v-for="(photo, index) in photos"
        :key="index"
        type="button"
        class="h-[60px] w-[82px] shrink-0 overflow-hidden rounded-xl border-2 md:h-20 md:w-[110px] md:rounded-2xl"
        :class="index === current ? 'border-brand' : 'border-transparent'"
        @click="current = index"
      >
        <img :src="urls[index]" :alt="photo.fileName" class="size-full object-cover" />
      </button>
    </div>

    <el-image-viewer
      v-if="viewerVisible"
      :url-list="urls"
      :initial-index="current"
      hide-on-click-modal
      @close="viewerVisible = false"
    />
  </div>

  <!-- 無照片 -->
  <div v-else class="flex flex-col gap-4">
    <div class="relative flex aspect-[776/450] items-center justify-center rounded-xl bg-placeholder md:rounded-2xl">
      <img :src="carPlaceholder" alt="" class="w-1/2 max-w-[400px]" />
      <div class="absolute top-4 left-4 flex gap-2"><slot name="badges" /></div>
    </div>
    <p class="flex items-start gap-1 rounded-lg bg-placeholder px-4 py-3 text-sm text-ink-regular">
      <el-icon class="mt-0.5 shrink-0" :size="14"><InfoFilled /></el-icon>
      <span>
        <strong class="font-semibold">{{ $t('detail.photosEmpty') }}</strong>
        {{ $t('detail.photosEmptyDesc') }}
      </span>
    </p>
  </div>
</template>

<style scoped>
.nav-btn {
  position: absolute;
  top: 50%;
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.6);
  color: #fff;
  font-size: 18px;
  transform: translateY(-50%);
}
</style>
