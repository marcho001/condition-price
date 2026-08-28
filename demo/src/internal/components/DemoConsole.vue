<template>
  <div class="demo-console" :class="{ open }">
    <button class="demo-toggle" @click="open = !open">
      <el-icon><Setting /></el-icon>
      <span v-if="open">{{ t('demo.title') }}</span>
    </button>
    <div v-if="open" class="demo-body">
      <div class="row">
        <span class="k">{{ t('demo.time') }}</span>
        <b class="num">{{ nowText }}</b>
      </div>
      <div class="row offset" v-if="db.timeOffset">
        {{ t('demo.offset', { v: offsetText }) }}
      </div>
      <div class="btns">
        <el-button size="small" @click="shiftTime(3600e3)">{{ t('demo.shift1h') }}</el-button>
        <el-button size="small" @click="shiftTime(6 * 3600e3)">{{ t('demo.shift6h') }}</el-button>
        <el-button size="small" @click="shiftTime(24 * 3600e3)">{{ t('demo.shift1d') }}</el-button>
      </div>
      <el-button size="small" text type="primary" @click="resetTime">{{ t('demo.resetTime') }}</el-button>
      <el-divider style="margin: 10px 0" />
      <el-button size="small" style="width: 100%" @click="openDealer">
        {{ t('demo.openDealer') }}
      </el-button>
      <el-button size="small" type="danger" plain style="width: 100%; margin: 8px 0 0" @click="doReset">
        {{ t('demo.resetData') }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { ElMessageBox } from 'element-plus'
import { db, serverNow, shiftTime, resetTime, resetDemoData } from '@/shared/store.js'

const { t } = useI18n()
const open = ref(false)
const nowText = computed(() => dayjs(serverNow.value).format('YYYY/MM/DD HH:mm:ss'))
const offsetText = computed(() => {
  const h = Math.round((db.timeOffset || 0) / 3600e3)
  return h >= 24 ? `+${Math.floor(h / 24)}d ${h % 24}h` : `+${h}h`
})

function openDealer() {
  window.open('/dealer.html', '_blank')
}

async function doReset() {
  try {
    await ElMessageBox.confirm(t('demo.resetDataConfirm'), t('demo.resetData'), { type: 'warning' })
    resetDemoData()
  } catch {
    /* cancelled */
  }
}
</script>

<style lang="scss" scoped>
.demo-console {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.demo-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  cursor: pointer;
  background: #2c2c37;
  color: #fff;
  border-radius: 999px;
  padding: 9px 14px;
  font-size: 12px;
  box-shadow: 0 6px 18px rgba(20, 24, 30, 0.22);
}

.demo-body {
  width: 236px;
  background: #fff;
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 10px 30px rgba(20, 24, 30, 0.16);
  border: 1px solid #eceff3;

  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 12px;
    color: #666;
    margin-bottom: 6px;
    b { color: #222; font-size: 13px; }
  }
  .offset { color: var(--el-color-primary); }
  .btns {
    display: flex;
    gap: 6px;
    margin: 8px 0 6px;
    :deep(.el-button) { flex: 1; margin: 0; }
  }
}
</style>
