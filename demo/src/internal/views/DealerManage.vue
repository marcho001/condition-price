<template>
  <div class="page-wrap">
    <div class="tab-filter-section">
      <el-form label-position="top" class="filter-form">
        <el-row :gutter="32">
          <el-col :span="6">
            <el-form-item :label="t('dealer.name')">
              <el-input v-model="filter.name" clearable @keyup.enter="apply" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="t('dealer.contactName')">
              <el-input v-model="filter.contactName" clearable @keyup.enter="apply" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="t('dealer.status')">
              <el-select v-model="filter.status" clearable>
                <el-option :label="t('dealer.active')" value="ACTIVE" />
                <el-option :label="t('dealer.inactive')" value="INACTIVE" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="&nbsp;">
              <div class="filter-btn-wrap">
                <el-button @click="reset">{{ t('common.reset') }}</el-button>
                <el-button type="primary" @click="apply">{{ t('common.search') }}</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <div class="table-section">
      <div class="flex-space-between mb-16">
        <div class="card-title" style="margin: 0">{{ t('dealer.title') }}</div>
        <el-button type="primary" @click="openForm('')">{{ t('dealer.add') }}</el-button>
      </div>

      <el-table :data="filtered" stripe>
        <el-table-column :label="t('dealer.name')" min-width="200">
          <template #default="{ row }">
            <b>{{ row.name }}</b>
            <div v-if="row.remark" class="text-muted sub">{{ row.remark }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="t('dealer.contactName')" width="130" prop="contactName" />
        <el-table-column :label="t('dealer.phone')" width="160">
          <template #default="{ row }"><span class="num">{{ row.phone }}</span></template>
        </el-table-column>
        <el-table-column :label="t('dealer.loginId')" min-width="220">
          <template #default="{ row }">
            <span class="num">{{ row.email }}</span>
            <div class="text-muted sub num">{{ t('dealer.password') }}：{{ row.password }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="t('dealer.status')" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small" effect="plain">
              {{ row.status === 'ACTIVE' ? t('dealer.active') : t('dealer.inactive') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('dealer.createdAt')" width="130">
          <template #default="{ row }"><span class="num">{{ fmtDate(row.createdAt) }}</span></template>
        </el-table-column>
        <el-table-column :label="t('common.operation')" :width="locale === 'ja' ? 300 : 260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openForm(row.id)">{{ t('dealer.edit') }}</el-button>
            <el-button link type="primary" @click="toggle(row)">
              {{ row.status === 'ACTIVE' ? t('dealer.disable') : t('dealer.enable') }}
            </el-button>
            <el-button link type="primary" @click="resetPwd(row)">{{ t('dealer.resetPassword') }}</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty :description="t('common.noData')" :image-size="80" /></template>
      </el-table>
    </div>

    <DealerFormDialog v-model="formOpen" :dealer-id="activeId" />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import DealerFormDialog from '../components/DealerFormDialog.vue'
import { db } from '@/shared/store.js'
import { updateDealer, resetDealerPassword } from '@/shared/engine.js'
import { fmtDate } from '@/shared/format.js'

const { t, locale } = useI18n()

const blank = () => ({ name: '', contactName: '', status: '' })
const filter = reactive(blank())
const applied = ref(blank())
const formOpen = ref(false)
const activeId = ref('')

const filtered = computed(() => {
  const f = applied.value
  return db.dealers.filter((d) => {
    if (f.name && !d.name.includes(f.name)) return false
    if (f.contactName && !d.contactName.includes(f.contactName)) return false
    if (f.status && d.status !== f.status) return false
    return true
  })
})

function apply() {
  applied.value = { ...filter }
}
function reset() {
  Object.assign(filter, blank())
  apply()
}
function openForm(id) {
  activeId.value = id
  formOpen.value = true
}

async function toggle(row) {
  const msg =
    row.status === 'ACTIVE'
      ? t('dealer.disableConfirm', { name: row.name })
      : t('dealer.enableConfirm', { name: row.name })
  try {
    await ElMessageBox.confirm(msg, row.status === 'ACTIVE' ? t('dealer.disable') : t('dealer.enable'), {
      type: 'warning'
    })
  } catch {
    return
  }
  updateDealer(row.id, { status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }, db.internalUser.name)
}

async function resetPwd(row) {
  try {
    await ElMessageBox.confirm(t('dealer.resetConfirm', { name: row.name }), t('dealer.resetPassword'), {
      type: 'warning'
    })
  } catch {
    return
  }
  const pwd = resetDealerPassword(row.id, db.internalUser.name)
  ElMessage.success(t('dealer.resetDone', { pwd }))
}
</script>

<style lang="scss" scoped>
.filter-form :deep(.el-form-item) { margin-bottom: 14px; }
.filter-form :deep(.el-select) { width: 100%; }
.filter-btn-wrap {
  display: flex;
  width: 100%;
  gap: 6px;
  :deep(.el-button) { flex: 1; margin: 0; }
}
.sub { font-size: 12px; line-height: 18px; }
</style>
