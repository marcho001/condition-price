<template>
  <div class="portal">
    <!-- 左側メニュー（xstar-web-pc の system-base-vue 準拠：幅 108px / #2c2c37） -->
    <menu class="left-menu-box">
      <div class="left-logo">X&nbsp;STAR</div>
      <ul class="nav-list">
        <li :class="{ active: true }">
          <p><span>{{ t('menu.category') }}</span></p>
          <div class="submenu-box">
            <div class="submenu-title">{{ t('menu.category') }}</div>
            <ul class="submenu-list">
              <li
                v-for="item in menuItems"
                :key="item.name"
                :class="{ on: route.name === item.name }"
                @click="router.push({ name: item.name })"
              >
                {{ t(item.label) }}
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </menu>

    <div class="main-right-box">
      <header class="top-header-box">
        <p class="top-header-title">{{ t('app.greeting', { name: db.internalUser.name }) }}</p>
        <div class="user-info-box">
          <el-tooltip :content="t('role.hint')" placement="bottom">
            <div class="role-switch">
              <span class="role-label">{{ t('role.label') }}</span>
              <el-checkbox-group v-model="roles" size="small">
                <el-checkbox-button :value="ROLE.OPERATION">{{ t('role.operation') }}</el-checkbox-button>
                <el-checkbox-button :value="ROLE.AWARD">{{ t('role.award') }}</el-checkbox-button>
              </el-checkbox-group>
            </div>
          </el-tooltip>

          <div class="lang-wrap">
            <div
              v-for="l in LANGS"
              :key="l.key"
              class="lang-item"
              :class="{ active: locale === l.key }"
              @click="setLocale(l.key)"
            >
              {{ l.label }}
            </div>
          </div>

          <p class="max-portrait">{{ db.internalUser.name.charAt(0) }}</p>
          <span class="user-name">{{ db.internalUser.name }}</span>
        </div>
      </header>

      <div class="main-box">
        <router-view />
      </div>
    </div>

    <DemoConsole />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { db } from '@/shared/store.js'
import { runScheduler } from '@/shared/engine.js'
import { ROLE } from '@/shared/constants.js'
import { LANGS, setLocale } from './i18n.js'
import DemoConsole from './components/DemoConsole.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const menuItems = [
  { name: 'vehicles', label: 'menu.vehicle' },
  { name: 'auctions', label: 'menu.auction' },
  { name: 'dealers', label: 'menu.dealer' }
]

const roles = computed({
  get: () => db.internalUser.roles,
  set: (v) => {
    // 少なくとも 1 つの権限は保持する
    db.internalUser.roles = v.length ? v : [ROLE.OPERATION]
  }
})

let timer = null
onMounted(() => {
  runScheduler()
  timer = setInterval(runScheduler, 1000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style lang="scss" scoped>
.portal {
  position: absolute;
  inset: 0;
}

.left-menu-box {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 999;
  width: 108px;
  margin: 0;
  padding: 0;
  background: var(--brand-sidebar);

  .left-logo {
    margin: 20px auto;
    width: 80px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 15px;
    letter-spacing: 0.16em;
    font-weight: 600;
  }

  .nav-list {
    position: absolute;
    width: 100%;
    top: 60px;
    bottom: 20px;
    overflow-y: auto;
    margin-top: 10px;
    padding: 0;
    list-style: none;

    > li {
      cursor: pointer;
      margin-bottom: 5px;
      text-align: center;

      &:hover .submenu-box { display: block; }

      &:hover p,
      &.active p {
        background-color: rgba(233, 238, 255, 0.2);
        span { color: #fff; }
      }

      > p {
        display: flex;
        height: 42px;
        line-height: 42px;
        border-radius: 4px;
        align-items: center;
        justify-content: center;
        margin: 0;

        span {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.69);
        }
      }
    }
  }

  .submenu-box {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 108px;
    background: #fff;
    width: 152px;
    border-right: 1px solid #ebeef5;
    display: none;
    cursor: default;
    z-index: 1000;

    .submenu-title {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: #171717;
      font-weight: 500;
      height: 60px;
      border-bottom: 1px solid #ebeef5;
    }

    .submenu-list {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        cursor: pointer;
        text-align: center;
        margin: 24px auto;
        font-size: 14px;
        color: #171717;

        &:hover,
        &.on { color: var(--el-color-primary); }
      }
    }
  }
}

.main-right-box {
  position: absolute;
  left: 108px;
  right: 0;
  top: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.top-header-box {
  flex: 0 0 60px;
  padding: 0 24px 0 20px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 6px 4px rgb(247 248 250 / 50%);
  z-index: 10;

  .top-header-title {
    font-size: 14px;
    color: #171717;
    font-weight: 500;
    margin: 0;
  }
}

.user-info-box {
  display: flex;
  align-items: center;
  gap: 16px;
}

.role-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 12px;
  border: 1px dashed #d3d7de;
  border-radius: 10px;

  .role-label {
    font-size: 12px;
    color: #9aa0a6;
  }
}

.lang-wrap {
  display: flex;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;

  .lang-item {
    padding: 5px 10px;
    font-size: 12px;
    color: #666;
    cursor: pointer;

    & + .lang-item { border-left: 1px solid #e4e7ed; }
    &.active {
      background: var(--el-color-primary);
      color: #fff;
    }
  }
}

.max-portrait {
  background: var(--brand-sidebar);
  border-radius: 50%;
  color: #fff;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  margin: 0;
}

.user-name {
  font-size: 14px;
  color: rgba(23, 23, 23, 0.97);
}

.main-box {
  flex: 1;
  width: 100%;
  overflow: auto;
}
</style>
