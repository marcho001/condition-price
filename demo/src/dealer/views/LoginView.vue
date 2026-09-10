<template>
  <div class="login-wrap">
    <div class="sheet-card">
      <div class="sheet-head">
        <span class="mark fig">XSTAR</span>
        <span class="sub fig">BIDDING</span>
      </div>

      <div class="sheet-body">
        <h1>{{ t('login.title') }}</h1>
        <p class="lead">{{ t('login.sub') }}</p>

        <form @submit.prevent="submit">
          <div class="field">
            <label for="email">{{ t('login.email') }}</label>
            <input id="email" v-model.trim="email" class="input" type="email" autocomplete="username" />
          </div>
          <div class="field">
            <label for="pwd">{{ t('login.password') }}</label>
            <input id="pwd" v-model="password" class="input" type="password" autocomplete="current-password" />
          </div>
          <p v-if="error" class="err">{{ error }}</p>
          <button class="btn btn-primary btn-block" type="submit">{{ t('login.submit') }}</button>
        </form>

        <!-- 本サイトにはパスワードの再設定・変更機能はありません（担当者が再発行） -->
        <p class="pw-note">{{ t('login.passwordNote') }}</p>
      </div>

      <div class="sheet-foot">
        <p class="eyebrow">{{ t('login.demoTitle') }}</p>
        <p class="hint">{{ t('login.demoHint') }}</p>
        <div class="chips">
          <button v-for="d in demoDealers" :key="d.id" class="chip" type="button" @click="fill(d)">
            <b>{{ d.name }}</b>
            <span class="fig">{{ d.email }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { db } from '@/shared/store.js'
import { dealerLogin } from '@/shared/engine.js'

const { t } = useI18n()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')

const demoDealers = computed(() => db.dealers)

function fill(d) {
  email.value = d.email
  password.value = d.password
  error.value = ''
}

// 連続 5 回の失敗でアカウントをロック。解除は社内の「ロック解除」のみ（自動解除なし）
const ERROR_KEY = {
  BAD_CREDENTIAL: 'login.error',
  LOCKED: 'login.locked',
  LOCKED_RETRY: 'login.lockedRetry',
  DISABLED: 'login.disabled'
}

function submit() {
  error.value = ''
  const res = dealerLogin(email.value, password.value)
  if (!res.ok) {
    error.value = t(ERROR_KEY[res.error] || 'login.error')
    return
  }
  router.replace({ name: 'list' })
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 16px 48px;
}

.sheet-card {
  width: 100%;
  max-width: 440px;
  background: var(--card);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.sheet-head {
  background: var(--ink);
  color: #eef1ec;
  padding: 18px 22px;
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.sheet-head .mark { font-size: 19px; letter-spacing: 0.2em; font-weight: 600; }
.sheet-head .sub { font-size: 10.5px; letter-spacing: 0.3em; color: #8e9a90; }

.sheet-body { padding: 26px 22px 20px; }

h1 { margin: 0 0 8px; font-size: 19px; font-weight: 600; letter-spacing: 0.01em; }

.lead { margin: 0 0 22px; font-size: 13px; line-height: 1.9; color: var(--ink-3); }

.err {
  margin: -4px 0 14px;
  font-size: 13px;
  color: var(--seal);
}

.pw-note {
  margin: 18px 0 0;
  font-size: 12px;
  line-height: 1.85;
  color: var(--ink-3);
  background: var(--sheet);
  border-radius: var(--r-sm);
  padding: 10px 12px;
}

.sheet-foot {
  border-top: 1px solid var(--rule-soft);
  background: #f6f8f5;
  padding: 18px 22px 22px;
}

.hint { margin: 6px 0 12px; font-size: 12px; line-height: 1.8; color: var(--ink-3); }

.chips { display: flex; flex-direction: column; gap: 7px; }

.chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  border: 1px solid var(--rule);
  background: var(--card);
  border-radius: 10px;
  padding: 9px 12px;
  cursor: pointer;
  text-align: left;
}
.chip:hover { border-color: var(--bid); }
.chip b { font-size: 13px; font-weight: 600; }
.chip span { font-size: 11.5px; color: var(--ink-3); }
</style>
