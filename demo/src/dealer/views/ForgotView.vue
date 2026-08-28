<template>
  <div class="wrap">
    <div class="card pad">
      <h1>{{ t('forgot.title') }}</h1>
      <template v-if="!sentTo">
        <p class="lead">{{ t('forgot.desc') }}</p>
        <form @submit.prevent="submit">
          <div class="field">
            <label for="fe">{{ t('forgot.email') }}</label>
            <input id="fe" v-model.trim="email" class="input" type="email" required />
          </div>
          <button class="btn btn-primary btn-block" type="submit">{{ t('forgot.submit') }}</button>
        </form>
      </template>
      <p v-else class="sent">{{ t('forgot.sent', { email: sentTo }) }}</p>
      <RouterLink class="back" :to="{ name: 'login' }">{{ t('forgot.back') }}</RouterLink>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const email = ref('')
const sentTo = ref('')

function submit() {
  // デモのためメール送信は行わず、送信済みの画面のみ表示する
  sentTo.value = email.value
}
</script>

<style scoped>
.wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 16px;
}
.card { width: 100%; max-width: 420px; }
.pad { padding: 26px 22px; }
h1 { margin: 0 0 10px; font-size: 18px; font-weight: 600; }
.lead { margin: 0 0 20px; font-size: 13px; line-height: 1.9; color: var(--ink-3); }
.sent {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.95;
  color: var(--ink-2);
  padding: 14px 16px;
  background: var(--bid-soft);
  border-radius: var(--r-md);
}
.back {
  display: inline-block;
  margin-top: 18px;
  font-size: 13px;
  color: var(--bid);
  border-bottom: 1px solid currentColor;
}
</style>
