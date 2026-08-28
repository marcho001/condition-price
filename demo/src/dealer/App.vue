<template>
  <div class="app">
    <header v-if="dealer" class="site-header">
      <RouterLink to="/" class="brand">
        {{ t('brand.name') }}<small>{{ t('brand.sub') }}</small>
      </RouterLink>
      <nav class="top-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          :class="{ on: isOn(item.name) }"
        >
          {{ t(`nav.${item.name}`) }}
          <span v-if="item.name === 'notices' && unread" class="badge fig">{{ unread }}</span>
        </RouterLink>
      </nav>
      <span class="spacer" />
      <span class="who">{{ dealer.name }}</span>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <nav v-if="dealer" class="bottom-nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.name"
        :to="{ name: item.name }"
        :class="{ on: isOn(item.name) }"
      >
        <NavIcon :name="item.name" />
        {{ t(`nav.${item.name}`) }}
        <span v-if="item.name === 'notices' && unread" class="badge fig">{{ unread }}</span>
      </RouterLink>
    </nav>

    <div class="toast-wrap">
      <div v-for="tItem in toasts" :key="tItem.id" class="toast" :class="{ err: tItem.kind === 'err' }">
        {{ tItem.message }}
      </div>
    </div>

    <DemoConsole />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import NavIcon from './components/NavIcon.vue'
import DemoConsole from './components/DemoConsole.vue'
import { toasts } from './toast.js'
import { db } from '@/shared/store.js'
import { dealerById, unreadCountOf, runScheduler } from '@/shared/engine.js'

const { t } = useI18n()
const route = useRoute()

const navItems = [{ name: 'list' }, { name: 'mybids' }, { name: 'won' }, { name: 'notices' }]

const dealer = computed(() => (db.dealerSession ? dealerById(db.dealerSession) : null))
const unread = computed(() => (dealer.value ? unreadCountOf(dealer.value.id) : 0))

function isOn(name) {
  if (name === 'list') return route.name === 'list' || route.name === 'detail'
  return route.name === name
}

let timer = null
onMounted(() => {
  runScheduler()
  timer = setInterval(runScheduler, 1000)
})
onUnmounted(() => clearInterval(timer))
</script>
