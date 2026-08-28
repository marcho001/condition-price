<template>
  <div class="info-section">
    <div class="info-title">
      {{ t('vehicle.sectionAttach') }}
      <span class="count text-muted">{{ list.length }}</span>
    </div>
    <p class="section-hint">{{ editable ? t('vehicle.attachHint') : t('vehicle.attachExcluded') }}</p>

    <div class="attach-grid">
      <div v-for="(a, i) in list" :key="a.id" class="attach-card">
        <div class="thumb" @click="preview(i)">
          <img :src="srcOf(a)" :alt="a.name" />
          <span v-if="a.mime === 'application/pdf'" class="pdf-badge">PDF</span>
          <span class="hover-mask"><el-icon><ZoomIn /></el-icon></span>
        </div>
        <div class="meta">
          <p class="name" :title="a.name">{{ a.name }}</p>
          <p class="sub">
            {{ a.source === 'intake' ? t('vehicle.attachSourceIntake') : t('vehicle.attachSourceModule') }}
            ・{{ a.uploader }}
          </p>
          <p class="sub">{{ fmtDateTime(a.uploadedAt) }}</p>
        </div>
        <el-button
          v-if="editable && a.source === 'module'"
          class="del"
          link
          type="danger"
          size="small"
          @click="remove(a)"
        >
          {{ t('common.delete') }}
        </el-button>
      </div>

      <label v-if="editable" class="attach-card upload">
        <input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple hidden @change="onPick" />
        <el-icon :size="26"><Plus /></el-icon>
        <span>{{ t('vehicle.attachUpload') }}</span>
      </label>
    </div>

    <el-image-viewer
      v-if="viewerIndex !== null"
      :url-list="srcList"
      :initial-index="viewerIndex"
      @close="viewerIndex = null"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { carPhoto } from '@/shared/photos.js'
import { vehicleView, addAttachment, removeAttachment } from '@/shared/engine.js'
import { db } from '@/shared/store.js'
import { fmtDateTime } from '@/shared/format.js'

const props = defineProps({
  vehicle: { type: Object, required: true },
  editable: { type: Boolean, default: false }
})

const { t } = useI18n()
const list = computed(() => props.vehicle.attachments)
const view = computed(() => vehicleView(props.vehicle))
const viewerIndex = ref(null)

const srcOf = (a) => a.dataUrl || carPhoto(a.kind, view.value)
const srcList = computed(() => list.value.map(srcOf))

function preview(i) {
  viewerIndex.value = i
}

async function remove(a) {
  try {
    await ElMessageBox.confirm(t('vehicle.attachDeleteConfirm', { name: a.name }), t('common.delete'), {
      type: 'warning'
    })
    removeAttachment(props.vehicle.id, a.id, db.internalUser.name)
  } catch {
    /* cancelled */
  }
}

function onPick(e) {
  const files = Array.from(e.target.files || [])
  files.forEach((file) => {
    if (file.size > 1.5 * 1024 * 1024) {
      ElMessage.warning(`${file.name}: 1.5MB 以下のファイルを選択してください（デモの保存容量制限）`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      addAttachment(
        props.vehicle.id,
        {
          name: file.name,
          kind: 'upload',
          category: file.type === 'application/pdf' ? 'RATING' : 'CONDITION',
          mime: file.type || 'image/jpeg',
          dataUrl: reader.result
        },
        db.internalUser.name
      )
    }
    reader.readAsDataURL(file)
  })
  e.target.value = ''
}
</script>

<style lang="scss" scoped>
.count {
  font-size: 13px;
  font-weight: 400;
}
.attach-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 12px;
}
.attach-card {
  border: 1px solid #eceff3;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  position: relative;

  .thumb {
    position: relative;
    aspect-ratio: 4 / 3;
    background: #f2f4f6;
    cursor: pointer;
    overflow: hidden;

    img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .hover-mask {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(20, 24, 30, 0.42);
      color: #fff;
      opacity: 0;
      transition: opacity 0.16s ease;
    }
    &:hover .hover-mask { opacity: 1; }

    .pdf-badge {
      position: absolute;
      left: 8px;
      top: 8px;
      background: #c8362b;
      color: #fff;
      font-size: 10px;
      letter-spacing: 0.08em;
      padding: 2px 6px;
      border-radius: 4px;
    }
  }

  .meta {
    padding: 8px 10px 10px;
    p { margin: 0; }
    .name {
      font-size: 12.5px;
      color: #222;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sub { font-size: 11px; color: #9aa0a6; line-height: 17px; }
  }

  .del { position: absolute; right: 6px; bottom: 6px; }

  &.upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 168px;
    border-style: dashed;
    color: #9aa0a6;
    cursor: pointer;
    font-size: 12.5px;

    &:hover { border-color: var(--el-color-primary); color: var(--el-color-primary); }
  }
}
</style>
