<script setup>
// 登入（規格 四；Figma：登录、登录/输入-报错状态、H5 登录）
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import loginBg from '@/assets/login-bg.jpg'
import logoDark from '@/assets/logo-dark.svg'
import logo from '@/assets/logo.svg'
import { useAuthStore } from '@/stores/auth'
import DemoAccounts from '@/demo/DemoAccounts.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({ email: '', password: '' })
// 欄位驗證錯誤顯示在欄位下方（紅字＋紅框）；送出後的 API 錯誤由 request 攔截器以 toast 顯示（規格 4.1）
const fieldErrors = reactive({ email: '', password: '' })
const submitting = ref(false)

function validate() {
  fieldErrors.email = form.email ? '' : t('common.required')
  fieldErrors.password = form.password ? '' : t('common.required')
  return !fieldErrors.email && !fieldErrors.password
}

// Demo：一鍵帶入帳號
function fillDemo({ email, password }) {
  Object.assign(form, { email, password })
  Object.assign(fieldErrors, { email: '', password: '' })
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  try {
    await auth.login({ ...form })
    router.replace(route.query.redirect || { name: 'auction-list' })
  } catch {
    // 帳密錯誤、鎖定、停用：攔截器已顯示後端訊息，停留在登入頁
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen bg-white">
    <!-- 左側品牌區（僅 PC） -->
    <aside class="relative hidden w-1/2 overflow-hidden md:block">
      <img :src="loginBg" alt="" class="absolute inset-0 size-full object-cover" />
      <div class="absolute inset-0 bg-[#0f1626]/65" />
      <div class="absolute top-1/2 left-[13%] flex max-w-[560px] -translate-y-1/2 flex-col gap-6 text-white">
        <div class="flex items-end gap-3">
          <img :src="logo" alt="XSTAR" class="h-7 w-40" />
          <span class="text-2xl leading-none font-light text-white/80">{{ $t('login.brandSub') }}</span>
        </div>
        <span class="h-[3px] w-[378px] max-w-full bg-brand" />
        <div class="flex flex-col gap-2">
          <p class="text-lg font-medium opacity-90">{{ $t('login.tagline') }}</p>
          <p class="text-sm text-white/50">{{ $t('login.subTagline') }}</p>
        </div>
      </div>
    </aside>

    <!-- 登入表單 -->
    <section class="flex flex-1 items-center justify-center px-8 py-20 md:px-[120px]">
      <div class="flex w-full max-w-[480px] flex-col gap-6 md:gap-10">
        <div class="flex items-end gap-2 md:hidden">
          <img :src="logoDark" alt="XSTAR" class="h-5 w-[113px]" />
          <span class="text-lg leading-none font-light text-ink">{{ $t('login.brandSub') }}</span>
        </div>

        <div class="flex flex-col gap-3">
          <h1 class="text-2xl font-bold text-ink md:text-[32px]">{{ $t('login.title') }}</h1>
          <p class="text-xs leading-[18px] text-ink-regular md:text-sm md:leading-[21px]">{{ $t('login.sub') }}</p>
        </div>

        <form class="flex flex-col gap-8" @submit.prevent="submit">
          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-ink">{{ $t('login.email') }}</span>
            <el-input
              v-model.trim="form.email"
              type="email"
              autocomplete="username"
              :placeholder="$t('login.placeholder')"
              class="login-input"
              :class="{ 'is-error': fieldErrors.email }"
            />
            <span v-if="fieldErrors.email" class="text-sm text-danger" role="alert">{{ fieldErrors.email }}</span>
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-ink">{{ $t('login.password') }}</span>
            <el-input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              show-password
              :placeholder="$t('login.placeholder')"
              class="login-input"
              :class="{ 'is-error': fieldErrors.password }"
            />
            <span v-if="fieldErrors.password" class="text-sm text-danger" role="alert">{{ fieldErrors.password }}</span>
          </label>
          <el-button type="primary" native-type="submit" :loading="submitting" class="!h-12 !text-base !font-bold">
            {{ $t('login.submit') }}
          </el-button>
        </form>

        <p class="rounded-lg bg-page p-4 text-xs leading-[19px] text-ink-hint">{{ $t('login.notice') }}</p>

        <!-- Demo 專用 -->
        <DemoAccounts @fill="fillDemo" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-input :deep(.el-input__wrapper) {
  height: 48px;
  padding: 0 16px;
  font-size: 16px;
}
.login-input.is-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--color-danger) inset;
}
</style>
