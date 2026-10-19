<!--
  Demo 用 portal 外框：模擬 xstar-web-pc 的 system-base-vue 主應用
  （左側 108px 深色選單＋hover 子選單、60px 頂部列、語系切換）。
  正式環境本模組是以 micro-app 嵌入主應用，選單與頂部列都由主應用提供；
  Demo 沒有主應用，由本元件代為呈現，並加上 Demo 專用的角色切換。
-->
<template>
  <div class="portal">
    <menu class="left-menu-box">
      <div class="left-logo">X&nbsp;STAR</div>
      <ul class="nav-list">
        <li class="active">
          <p><span>{{ t('shell.category') }}</span></p>
          <div class="submenu-box">
            <div class="submenu-title">{{ t('shell.category') }}</div>
            <ul class="submenu-list">
              <li
                v-for="item in menuItems"
                :key="item.path"
                :class="{ on: route.path === item.path }"
                @click="go(item.path)"
              >
                {{ $t(item.label) }}
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </menu>

    <div class="main-right-box">
      <header class="top-header-box">
        <p class="top-header-title">
          <span class="crumb">{{ t('shell.category') }}</span>
          <span class="crumb-sep">/</span>
          <span v-if="currentLabel">{{ $t(currentLabel) }}</span>
        </p>
        <div class="user-info-box">
          <!-- Demo：角色切換（一個帳號可同時擁有兩個角色；至少保留一個） -->
          <el-tooltip :content="t('shell.roleHint')" placement="bottom">
            <div class="role-switch">
              <span class="role-label">{{ t('shell.role') }}</span>
              <el-checkbox-group v-model="roles" size="small">
                <el-checkbox-button :value="ROLE.COLLECTION">{{ t('shell.collection') }}</el-checkbox-button>
                <el-checkbox-button :value="ROLE.FINANCE">{{ t('shell.finance') }}</el-checkbox-button>
              </el-checkbox-group>
            </div>
          </el-tooltip>

          <div class="lang-wrap">
            <div
              v-for="l in LANGS"
              :key="l.key"
              class="lang-item"
              :class="{ active: languageStore.language === l.key }"
              @click="languageStore.changeLanguage(l.key)"
            >
              {{ l.label }}
            </div>
          </div>

          <p class="max-portrait">{{ userName.charAt(0) }}</p>
          <span class="user-name">{{ userName }}</span>
        </div>
      </header>

      <div class="main-box">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { db } from '../../shared/store.js';
import { ROLE } from '../../shared/constants.js';
import { useLanguageStore } from '@/store';

const { t } = useI18n({
  useScope: 'local',
  messages: {
    ja: {
      shell: {
        category: '車両オークション',
        role: '権限（デモ）',
        collection: '督促担当',
        finance: '財務担当',
        roleHint:
          'デモ用の権限切替。財務担当のみにすると「締切済み」タブが消え、「開始待ち」の取消・「進行中」の催促・「落札済み」の操作欄が非表示になります（閲覧のみ）。'
      }
    },
    zhCn: {
      shell: {
        category: '车辆拍卖',
        role: '权限（Demo）',
        collection: '催收人员',
        finance: '财务人员',
        roleHint:
          'Demo 用权限切换。只保留财务人员时，「已结标」tab 会消失，「待开始」的取消排定、「拍卖进行中」的催投与「已决标」的操作栏也不呈现（只读）。'
      }
    }
  }
});

const route = useRoute();
const router = useRouter();
const languageStore = useLanguageStore();

const LANGS = [
  { key: 'ja', label: '日本語' },
  { key: 'zhCn', label: '中文' }
];

const menuItems = [
  { path: '/auction-management/vehicleManagement/list', label: 'menu.vehicleManagement' },
  { path: '/auction-management/auctionManagement/list', label: 'menu.auctionManagement' },
  { path: '/auction-management/dealerManagement/list', label: 'menu.dealerManagement' }
];

// 子選單名稱沿用本模組 i18n 的 menu.*（全域語系）
const currentLabel = computed(() => menuItems.find((item) => item.path === route.path)?.label || '');

const go = (path) => {
  if (route.path !== path) router.push({ path, query: { entryType: 'menu' } });
};

const userName = computed(() => db.internalUser?.name || '');

const roles = computed({
  get: () => db.internalUser.roles,
  set: (val) => {
    // 至少保留一個角色
    if (val.length) db.internalUser.roles = val;
  }
});
</script>

<style lang="scss" scoped>
.portal {
  position: absolute;
  inset: 0;
  min-width: 1188px;
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
  background: #2c2c37;

  .left-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 30px;
    margin: 20px auto;
    color: #ffffff;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.16em;
  }

  .nav-list {
    position: absolute;
    top: 60px;
    bottom: 20px;
    width: 100%;
    margin-top: 10px;
    padding: 0;
    overflow-y: auto;
    list-style: none;

    > li {
      margin-bottom: 5px;
      text-align: center;
      cursor: pointer;

      &:hover .submenu-box {
        display: block;
      }

      &:hover p,
      &.active p {
        background-color: rgba(233, 238, 255, 0.2);

        span {
          color: #ffffff;
        }
      }

      > p {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        margin: 0 4px;
        padding: 6px 0;
        border-radius: 4px;

        span {
          font-size: 12px;
          line-height: 16px;
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
    z-index: 1000;
    display: none;
    width: 152px;
    border-right: 1px solid #ebeef5;
    background: #ffffff;
    cursor: default;

    .submenu-title {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 60px;
      border-bottom: 1px solid #ebeef5;
      font-size: 16px;
      font-weight: 500;
      color: #171717;
    }

    .submenu-list {
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        margin: 24px auto;
        text-align: center;
        font-size: 14px;
        line-height: 20px;
        color: #171717;
        cursor: pointer;

        &:hover,
        &.on {
          color: var(--el-color-primary);
        }
      }
    }
  }
}

.main-right-box {
  position: absolute;
  top: 0;
  right: 0;
  left: 108px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.top-header-box {
  z-index: 10;
  display: flex;
  flex: 0 0 60px;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px 0 20px;
  background: #ffffff;
  box-shadow: 0 4px 6px 4px rgb(247 248 250 / 50%);

  .top-header-title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    color: #171717;

    .crumb {
      color: #999999;
    }

    .crumb-sep {
      margin: 0 8px;
      color: #c0c4cc;
    }
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
    line-height: 16px;
    color: #9aa0a6;
  }
}

.lang-wrap {
  display: flex;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  border-radius: 8px;

  .lang-item {
    padding: 5px 10px;
    font-size: 12px;
    line-height: 16px;
    color: #666666;
    cursor: pointer;

    & + .lang-item {
      border-left: 1px solid #e4e7ed;
    }

    &.active {
      color: #ffffff;
      background: var(--el-color-primary);
    }
  }
}

.max-portrait {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin: 0;
  border-radius: 50%;
  font-size: 15px;
  color: #ffffff;
  background: #2c2c37;
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
