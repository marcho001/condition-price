<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? t('dealer.editTitle') : t('dealer.addTitle')"
    width="520px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-alert v-if="!isEdit" :title="t('dealer.addHint')" type="info" :closable="false" show-icon />
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" style="margin-top: 12px">
      <el-form-item :label="t('dealer.name')" prop="name">
        <el-input v-model="form.name" maxlength="60" />
      </el-form-item>
      <el-form-item :label="t('dealer.contactName')" prop="contactName">
        <el-input v-model="form.contactName" maxlength="30" />
      </el-form-item>
      <el-form-item :label="t('dealer.phone')" prop="phone">
        <el-input v-model="form.phone" maxlength="20" />
        <p class="section-hint" style="margin: 4px 0 0">{{ t('dealer.phoneHint') }}</p>
      </el-form-item>
      <!-- 編集時も Email は disable しない（＝ログイン ID の変更） -->
      <el-form-item :label="t('dealer.email')" prop="email">
        <el-input v-model="form.email" maxlength="80" />
        <p class="section-hint" style="margin: 4px 0 0">{{ t('dealer.emailHint') }}</p>
        <p v-if="isEdit" class="section-hint" style="margin: 2px 0 0">{{ t('dealer.loginIdChangeHint') }}</p>
      </el-form-item>
      <el-form-item :label="t('dealer.remark')">
        <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="120" show-word-limit />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="submit">{{ t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addDealer, updateDealer, dealerById, isLoginIdTaken } from '@/shared/engine.js'
import { db } from '@/shared/store.js'

const props = defineProps({ modelValue: Boolean, dealerId: String })
const emit = defineEmits(['update:modelValue', 'done'])

const { t } = useI18n()
const formRef = ref()
const isEdit = computed(() => !!props.dealerId)
const form = reactive({ name: '', contactName: '', phone: '', email: '', remark: '' })

const rules = computed(() => ({
  name: [{ required: true, message: t('common.required'), trigger: 'blur' }],
  contactName: [{ required: true, message: t('common.required'), trigger: 'blur' }],
  phone: [{ required: true, message: t('common.required'), trigger: 'blur' }],
  email: [
    { required: true, message: t('common.required'), trigger: 'blur' },
    { type: 'email', message: 'Email', trigger: 'blur' },
    // 他の販売店（停止中も含む）のログイン ID と重複させない
    {
      validator: (_r, value, cb) =>
        isLoginIdTaken(value, props.dealerId) ? cb(new Error(t('dealer.emailTaken'))) : cb(),
      trigger: 'blur'
    }
  ]
}))

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    const d = props.dealerId ? dealerById(props.dealerId) : null
    Object.assign(form, {
      name: d?.name || '',
      contactName: d?.contactName || '',
      phone: d?.phone || '',
      email: d?.email || '',
      remark: d?.remark || ''
    })
    formRef.value?.clearValidate()
  }
)

async function submit() {
  const ok = await formRef.value.validate().catch(() => false)
  if (!ok) return

  if (isEdit.value) {
    const current = dealerById(props.dealerId)
    // ログイン ID の変更は二次確認。旧 Email は即時に使えなくなり、パスワードは変わらない
    if (current && current.email !== form.email) {
      try {
        await ElMessageBox.confirm(
          t('dealer.loginIdChangeConfirm', { before: current.email, after: form.email }),
          t('dealer.loginIdChangeTitle'),
          { type: 'warning' }
        )
      } catch {
        return
      }
    }
    updateDealer(props.dealerId, { ...form }, db.internalUser.name)
  } else {
    addDealer({ ...form }, db.internalUser.name)
  }
  ElMessage.success(t('common.save'))
  emit('update:modelValue', false)
  emit('done')
}
</script>
