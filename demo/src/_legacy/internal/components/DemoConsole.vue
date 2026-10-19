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

      <!-- 貸後端的兩支入向介接 API。本模組不提供對應的手動按鈕，一律由貸後呼叫推進 -->
      <p class="k section">{{ t('demo.callbackTitle') }}</p>
      <el-tooltip :content="t('demo.receiveVehicleHint')" placement="left">
        <span class="block">
          <el-button
            size="small"
            style="width: 100%"
            :disabled="!nextIntake"
            @click="doReceiveVehicle"
          >
            {{ t('demo.receiveVehicle') }}
            <span v-if="nextIntake" class="num tail">{{ nextIntake.orderNo }}</span>
          </el-button>
        </span>
      </el-tooltip>
      <p v-if="!nextIntake" class="hint">{{ t('demo.receiveVehicleNone') }}</p>

      <el-tooltip :content="t('demo.settleOrderHint')" placement="left">
        <span class="block">
          <el-button
            size="small"
            style="width: 100%; margin: 8px 0 0"
            :disabled="!settleTargets.length"
            @click="settleOpen = true"
          >
            {{ t('demo.settleOrder') }}
          </el-button>
        </span>
      </el-tooltip>
      <p v-if="!settleTargets.length" class="hint">{{ t('demo.settleOrderNone') }}</p>

      <el-tooltip :content="t('demo.dealApiFailHint')" placement="left">
        <div class="row switch-row">
          <span class="k">{{ t('demo.dealApiFail') }}</span>
          <el-switch v-model="dealApiFail" size="small" />
        </div>
      </el-tooltip>

      <el-divider style="margin: 10px 0" />

      <!-- 帳號通知（事件 6、7）僅 Email，不進站內通知 -->
      <p class="k section">{{ t('demo.emailLog') }}</p>
      <div v-if="emails.length" class="mail-list">
        <p v-for="m in emails" :key="m.id" class="mail">
          <b>{{ m.type === 'ACCOUNT_ISSUED' ? t('demo.emailAccountIssued') : t('demo.emailPasswordReset') }}</b>
          <span class="num">{{ m.to }}</span>
          <span class="num">{{ m.password }}</span>
        </p>
      </div>
      <p v-else class="hint">{{ t('demo.emailLogEmpty') }}</p>

      <el-divider style="margin: 10px 0" />

      <el-button size="small" style="width: 100%" @click="openDealer">
        {{ t('demo.openDealer') }}
      </el-button>
      <el-button size="small" type="danger" plain style="width: 100%; margin: 8px 0 0" @click="doReset">
        {{ t('demo.resetData') }}
      </el-button>
    </div>

    <!-- 結清通知：選擇要通知結清的 orderNo -->
    <el-dialog v-model="settleOpen" :title="t('demo.settleOrder')" width="480px">
      <p class="section-hint">{{ t('demo.settleOrderHint') }}</p>
      <el-radio-group v-model="settlePick" class="settle-list">
        <el-radio v-for="x in settleTargets" :key="x.vehicle.id" :value="x.vehicle.orderNo" border>
          <span class="num">{{ x.vehicle.orderNo }}</span>
          <span class="settle-car">{{ carLabel(x.vehicle) }}</span>
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="settleOpen = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :disabled="!settlePick" @click="doSettle">
          {{ t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { db, serverNow, shiftTime, resetTime, resetDemoData } from '@/shared/store.js'
import {
  receiveVehicleCallback,
  settleOrderCallback,
  settleableOrders,
  allEmails,
  vehicleView
} from '@/shared/engine.js'

const { t } = useI18n()
const open = ref(false)
const settleOpen = ref(false)
const settlePick = ref('')
const nowText = computed(() => dayjs(serverNow.value).format('YYYY/MM/DD HH:mm:ss'))
const offsetText = computed(() => {
  const h = Math.round((db.timeOffset || 0) / 3600e3)
  return h >= 24 ? `+${Math.floor(h / 24)}d ${h % 24}h` : `+${h}h`
})

const nextIntake = computed(() => db.intakePool[0] || null)
const settleTargets = computed(() => settleableOrders())
const emails = computed(() => allEmails().slice(0, 4))

const dealApiFail = computed({
  get: () => db.demo.dealApiFail,
  set: (v) => {
    db.demo.dealApiFail = v
  }
})

const carLabel = (v) => {
  const view = vehicleView(v)
  return `${view.makeName} ${view.seriesName}`
}

function doReceiveVehicle() {
  const target = nextIntake.value
  if (!target) return
  // 收車日一律由貸後團隊帶入且為必填，本模組不自行推算
  const res = receiveVehicleCallback({
    orderNo: target.orderNo,
    receivedAt: dayjs(serverNow.value).format('YYYY-MM-DD'),
    operator: '貸後チーム（デモ）'
  })
  if (res.ok) ElMessage.success(t('demo.receiveVehicleDone', { orderNo: target.orderNo }))
}

function doSettle() {
  const orderNo = settlePick.value
  const res = settleOrderCallback({ orderNo })
  if (res.ok) ElMessage.success(t('demo.settleOrderDone', { orderNo }))
  settleOpen.value = false
  settlePick.value = ''
}

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
  max-height: 78vh;
  overflow-y: auto;
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
  .k.section { display: block; margin: 0 0 6px; font-size: 11.5px; color: #909399; }
  .hint { margin: 4px 0 0; font-size: 11px; line-height: 16px; color: #b6bcc4; }
  .block { display: block; }
  .tail { margin-left: 4px; font-size: 11px; opacity: 0.7; }
  .switch-row { margin: 10px 0 0; }
  .mail-list { display: flex; flex-direction: column; gap: 6px; }
  .mail {
    margin: 0;
    display: flex;
    flex-direction: column;
    font-size: 11px;
    line-height: 15px;
    color: #909399;
    b { color: #222; font-size: 11.5px; }
  }
  .btns {
    display: flex;
    gap: 6px;
    margin: 8px 0 6px;
    :deep(.el-button) { flex: 1; margin: 0; }
  }
}

.settle-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  :deep(.el-radio) { margin-right: 0; height: auto; padding: 12px; }
}
.settle-car { margin-left: 10px; color: #909399; font-size: 12.5px; }
</style>
