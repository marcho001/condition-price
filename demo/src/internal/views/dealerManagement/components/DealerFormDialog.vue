<!--
  新增／编辑厂商（规格 6、6.2；portal/auction-management/save-dealer.action.md）

  - 新增：建立主档，状态预设启用，一并开通对外站账号、产生登入密码并寄送帐号开通信（后端处理）
  - 编辑：可修改 Email（登入账号），密码不变、不重发通知；送出前以弹窗二次确认
  - Email 唯一性由后端校验，重复时回 1101
-->
<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? $t('dealer.form.editTitle') : $t('dealer.form.addTitle')"
    :width="640"
    :close-on-click-modal="false"
    destroy-on-close
    @open="initForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item :label="$t('dealer.form.dealerName')" prop="dealerName">
        <el-input
          v-model="form.dealerName"
          :maxlength="200"
          clearable
          :placeholder="$t('inputPlaceholder')"
        />
      </el-form-item>
      <el-form-item :label="$t('dealer.form.contactName')" prop="contactName">
        <el-input
          v-model="form.contactName"
          :maxlength="200"
          clearable
          :placeholder="$t('inputPlaceholder')"
        />
      </el-form-item>
      <el-form-item :label="$t('dealer.form.phone')" prop="phone">
        <el-input
          v-model="form.phone"
          :maxlength="11"
          clearable
          :placeholder="$t('inputPlaceholder')"
        />
        <div class="field-tip">{{ $t('dealer.form.phoneTip') }}</div>
      </el-form-item>
      <el-form-item :label="$t('dealer.form.email')" prop="email">
        <el-input
          v-model="form.email"
          :maxlength="200"
          clearable
          :placeholder="$t('inputPlaceholder')"
        />
        <div class="field-tip">{{ $t('dealer.form.emailTip') }}</div>
      </el-form-item>
      <el-form-item :label="$t('dealer.form.remark')" prop="remark">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          :maxlength="500"
          show-word-limit
          :placeholder="$t('inputPlaceholder')"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">{{ $t('cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ $t('confirm') }}
      </el-button>
    </template>

    <!-- 登入账号变更二次确认（规格 6.2） -->
    <el-dialog
      v-model="emailConfirmVisible"
      :title="$t('dealer.confirm.emailChangeTitle')"
      :width="520"
      append-to-body
    >
      <div class="confirm-content">
        {{
          $t('dealer.confirm.emailChangeContent', {
            oldEmail: originalEmail,
            newEmail: form.email
          })
        }}
      </div>
      <template #footer>
        <el-button @click="emailConfirmVisible = false">{{ $t('back') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="doSave">
          {{ $t('confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { isBizSuccess } from '@packages/x-axios';
import { isEmail } from '@packages/utils';
import { saveDealer } from '@/api/dealer';

const { t } = useI18n();

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 编辑时带入的厂商资料；新增时为 null */
  dealer: { type: Object, default: null }
});
const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const isEdit = computed(() => !!props.dealer?.id);
const formRef = ref(null);
const submitting = ref(false);
const emailConfirmVisible = ref(false);
const originalEmail = ref('');

const form = reactive({
  id: null,
  dealerName: '',
  contactName: '',
  phone: '',
  email: '',
  remark: ''
});

const rules = computed(() => ({
  dealerName: [{ required: true, message: t('validator.empty'), trigger: 'blur' }],
  contactName: [{ required: true, message: t('validator.empty'), trigger: 'blur' }],
  phone: [{ required: true, message: t('validator.empty'), trigger: 'blur' }],
  email: [
    { required: true, message: t('validator.empty'), trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value && !isEmail(value)) {
          return callback(new Error(t('dealer.form.emailInvalid')));
        }
        callback();
      },
      trigger: 'blur'
    }
  ]
}));

const initForm = () => {
  const source = props.dealer || {};
  form.id = source.id ?? null;
  form.dealerName = source.dealerName || '';
  form.contactName = source.contactName || '';
  form.phone = source.phone || '';
  form.email = source.email || '';
  form.remark = source.remark || '';
  originalEmail.value = source.email || '';
  emailConfirmVisible.value = false;
  formRef.value?.clearValidate();
};

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  // 编辑且变更了登入账号，先二次确认
  if (isEdit.value && form.email !== originalEmail.value) {
    emailConfirmVisible.value = true;
    return;
  }
  doSave();
};

const doSave = async () => {
  submitting.value = true;
  try {
    const res = await saveDealer({
      id: form.id,
      dealerName: form.dealerName,
      contactName: form.contactName,
      phone: form.phone,
      email: form.email,
      remark: form.remark || null
    });
    // Email 与其他厂商重复时后端回 1101，由 axios 统一提示
    if (!isBizSuccess(res?.code)) return;
    ElMessage.success(t('dealer.form.saveSuccess'));
    emailConfirmVisible.value = false;
    visible.value = false;
    emit('success');
  } finally {
    submitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
.field-tip {
  @include pingfang-regular(12px, 20px, left, #999999);
}

.confirm-content {
  @include pingfang-regular(14px, 24px);
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}
</style>
