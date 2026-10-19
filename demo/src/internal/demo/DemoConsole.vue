<!--
  Demo 控制台（右下角浮動）：正式系統沒有這些操作，僅供試用時推進情境。
  - 時間快轉：觀察開始日 00:00 轉投標中、09:00 發通知、自動催投、截止轉已結標
  - 代替貸後團隊呼叫兩支入向介接 API（收車通知、結清通知）；本模組不提供對應的手動按鈕
  - 讓「成交通知」失敗：觀察指定成交後留在已結標、可重試
  - 帳號通知（第 6、7 項，僅 Email）的寄送內容，文案依規格 8.1
-->
<template>
  <div class="demo-console">
    <transition name="demo-fade">
      <div v-if="open" class="demo-body">
        <div class="demo-head">
          <span>{{ t('demo.title') }}</span>
          <el-button link :icon="Close" @click="open = false" />
        </div>

        <!-- 伺服器時間 -->
        <div class="row time-row">
          <span class="k">{{ t('demo.time') }}</span>
          <b class="num">{{ nowText }}</b>
        </div>
        <div v-if="db.timeOffset" class="row offset">{{ t('demo.offset', { v: offsetText }) }}</div>
        <div class="btns">
          <el-button size="small" @click="shift(3600e3)">+1h</el-button>
          <el-button size="small" @click="shift(6 * 3600e3)">+6h</el-button>
          <el-button size="small" @click="shift(24 * 3600e3)">+1d</el-button>
        </div>
        <el-button v-if="db.timeOffset" size="small" link type="primary" @click="backToNow">
          {{ t('demo.resetTime') }}
        </el-button>

        <el-divider />

        <!-- 貸後端的兩支入向介接 API -->
        <p class="section">{{ t('demo.callbackTitle') }}</p>
        <el-button size="small" class="full" :disabled="!db.intakePool.length" @click="openReceive">
          {{ t('demo.receiveVehicle') }}
          <span class="tail">（{{ db.intakePool.length }}）</span>
        </el-button>
        <el-button
          size="small"
          class="full"
          :disabled="!settleTargets.length"
          @click="openSettle"
        >
          {{ t('demo.settleOrder') }}
          <span class="tail">（{{ settleTargets.length }}）</span>
        </el-button>
        <el-tooltip :content="t('demo.dealApiFailHint')" placement="left">
          <div class="row switch-row">
            <span class="k">{{ t('demo.dealApiFail') }}</span>
            <el-switch v-model="db.demo.dealApiFail" size="small" />
          </div>
        </el-tooltip>

        <el-divider />

        <!-- 帳號通知（僅 Email） -->
        <p class="section">{{ t('demo.emailLog') }}</p>
        <div v-if="emails.length" class="mail-list">
          <div v-for="m in emails" :key="m.id" class="mail" @click="mailOpen = m">
            <b>{{ m.type === EMAIL_TYPE.ACCOUNT_ISSUED ? t('demo.emailIssued') : t('demo.emailReset') }}</b>
            <span class="num">{{ m.to }}</span>
            <span class="num sub">{{ fmtTime(m.at) }}</span>
          </div>
        </div>
        <p v-else class="hint">{{ t('demo.emailEmpty') }}</p>

        <el-divider />

        <el-button size="small" class="full" @click="openDealerSite">{{ t('demo.openDealer') }}</el-button>
        <el-button size="small" class="full" type="danger" plain @click="doReset">
          {{ t('demo.resetData') }}
        </el-button>
      </div>
    </transition>

    <button class="demo-toggle" @click="open = !open">
      <el-icon><Setting /></el-icon>
      <span>{{ t('demo.title') }}</span>
      <span v-if="db.timeOffset" class="toggle-offset">{{ offsetText }}</span>
    </button>

    <!-- 收車通知 -->
    <el-dialog v-model="receiveOpen" :title="t('demo.receiveVehicle')" width="520px" append-to-body>
      <p class="dialog-hint">{{ t('demo.receiveHint') }}</p>
      <el-form label-position="top">
        <el-form-item label="orderNo">
          <el-select v-model="receiveForm.orderNo" style="width: 100%">
            <el-option
              v-for="x in db.intakePool"
              :key="x.orderNo"
              :value="x.orderNo"
              :label="`${x.orderNo}　${carLabel(x.vehicle)}`"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('demo.receivedAt')">
          <el-date-picker
            v-model="receiveForm.receivedAt"
            type="date"
            value-format="YYYY-MM-DD"
            format="YYYY/MM/DD"
            :clearable="false"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="receiveOpen = false">{{ $t('cancel') }}</el-button>
        <el-button type="primary" :disabled="!receiveForm.orderNo" @click="doReceive">
          {{ $t('confirm') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 結清通知 -->
    <el-dialog v-model="settleOpen" :title="t('demo.settleOrder')" width="520px" append-to-body>
      <p class="dialog-hint">{{ t('demo.settleHint') }}</p>
      <el-radio-group v-model="settlePick" class="settle-list">
        <el-radio v-for="x in settleTargets" :key="x.vehicle.id" :value="x.vehicle.orderNo" border>
          <span class="num">{{ x.vehicle.orderNo }}</span>
          <span class="settle-car">{{ carLabel(x.vehicle) }}</span>
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="settleOpen = false">{{ $t('cancel') }}</el-button>
        <el-button type="primary" :disabled="!settlePick" @click="doSettle">{{ $t('confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- Email 內容（規格 8.1，一律日文） -->
    <el-dialog
      :model-value="!!mailOpen"
      :title="mailOpen ? mailText(mailOpen).subject : ''"
      width="600px"
      append-to-body
      @update:model-value="mailOpen = null"
    >
      <template v-if="mailOpen">
        <p class="mail-meta">To: {{ mailOpen.to }}　{{ fmtTime(mailOpen.at) }}</p>
        <pre class="mail-body">{{ mailText(mailOpen).body }}</pre>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import dayjs from 'dayjs';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Close, Setting } from '@element-plus/icons-vue';
import { db, serverNow, shiftTime, resetTime, resetDemoData } from '../../shared/store.js';
import { EMAIL_TYPE } from '../../shared/constants.js';
import {
  receiveVehicleCallback,
  settleOrderCallback,
  settleableOrders,
  allEmails,
  vehicleView,
  dealerById,
  runScheduler,
  serverToday
} from '../../shared/engine.js';

const { t } = useI18n({
  useScope: 'local',
  messages: {
    ja: {
      demo: {
        title: 'デモ操作',
        time: 'サーバー時間（JST）',
        offset: '早送り：{v}',
        resetTime: '現在時刻に戻す',
        callbackTitle: '貸後チームからの通知（代理呼び出し）',
        receiveVehicle: '引取通知を呼び出す',
        receiveHint:
          '貸後チームの代わりに orderNo と引取日を渡して呼び出します。車両データは payload に含まれず、本モジュールが orderNo から取得します（添付ファイルは引き継がれません）。',
        receivedAt: '引取日',
        receiveDone: '引取通知を受信しました（orderNo：{orderNo}）。車両管理に 1 件追加されました。',
        receiveFailed: '引取通知の処理に失敗しました：{error}',
        settleOrder: '完済通知を呼び出す',
        settleHint:
          '名義変更・入金の完了後に貸後チームが呼び出す通知です。対象は「落札済み」から論理削除されます（販売店への通知はありません）。',
        settleDone: '完済通知を受信しました（orderNo：{orderNo}）。落札済みから除外されました。',
        dealApiFail: '成約通知を失敗させる',
        dealApiFailHint:
          'オンにすると「成約販売店の指定」時の貸後への成約通知が失敗し、案件は「締切済み」に残ります（再試行可）。',
        emailLog: 'アカウント通知（Email のみ）',
        emailIssued: 'アカウント発行',
        emailReset: 'パスワード再発行',
        emailEmpty: '送信履歴はありません',
        openDealer: '販売店入札サイトを開く',
        resetData: 'デモデータを初期化',
        resetConfirm: 'すべての操作結果を破棄し、初期状態に戻します。よろしいですか？'
      }
    },
    zhCn: {
      demo: {
        title: 'Demo 控制',
        time: '服务器时间（JST）',
        offset: '快转：{v}',
        resetTime: '回到现在时间',
        callbackTitle: '贷后团队介接 API（Demo 代呼叫）',
        receiveVehicle: '呼叫收车通知',
        receiveHint:
          '代替贷后团队带 orderNo 与收车日呼叫。车辆资料不随 payload 传入，由本模块依 orderNo 自行取得（附件不带入）。',
        receivedAt: '收车日',
        receiveDone: '已收到收车通知（orderNo：{orderNo}），车辆管理新增 1 笔。',
        receiveFailed: '收车通知处理失败：{error}',
        settleOrder: '呼叫结清通知',
        settleHint: '贷后在车辆过户并收到款项后呼叫，该笔以软删除自「已决标」移除（不通知厂商）。',
        settleDone: '已收到结清通知（orderNo：{orderNo}），该笔已自已决标移除。',
        dealApiFail: '让成交通知失败',
        dealApiFailHint: '开启后「指定成交厂商」时对贷后的成交通知会失败，订单留在「已结标」可重试。',
        emailLog: '账号通知（仅 Email）',
        emailIssued: '账号开通',
        emailReset: '密码重设',
        emailEmpty: '尚无寄送纪录',
        openDealer: '开启厂商竞价站',
        resetData: '重置 Demo 数据',
        resetConfirm: '将舍弃所有操作结果，回到初始状态。确定吗？'
      }
    }
  }
});

const open = ref(false);

// ── 時間 ──
const nowText = computed(() => dayjs(serverNow.value).format('YYYY/MM/DD HH:mm:ss'));
const offsetText = computed(() => {
  const h = Math.round((db.timeOffset || 0) / 3600e3);
  return h >= 24 ? `+${Math.floor(h / 24)}d${h % 24 ? ` ${h % 24}h` : ''}` : `+${h}h`;
});
const shift = (ms) => {
  shiftTime(ms);
  // serverNow 依 1 秒 tick 計算，先讓 offset 生效再跑排程
  setTimeout(runScheduler, 0);
};
const backToNow = () => resetTime();
const fmtTime = (ms) => dayjs(ms).format('YYYY/MM/DD HH:mm');

const carLabel = (v) => {
  const view = vehicleView(v);
  return `${view.makeName} ${view.seriesName}（${view.licensingPlateNumber}）`;
};

// ── 收車通知 ──
const receiveOpen = ref(false);
const receiveForm = reactive({ orderNo: '', receivedAt: '' });
const openReceive = () => {
  receiveForm.orderNo = db.intakePool[0]?.orderNo || '';
  // 收車日由貸後帶入且為必填；預設為今日
  receiveForm.receivedAt = serverToday();
  receiveOpen.value = true;
};
const doReceive = () => {
  const res = receiveVehicleCallback({
    orderNo: receiveForm.orderNo,
    receivedAt: receiveForm.receivedAt,
    operator: '貸後チーム（デモ）'
  });
  if (res.ok) {
    ElMessage.success(t('demo.receiveDone', { orderNo: receiveForm.orderNo }));
    receiveOpen.value = false;
  } else {
    ElMessage.error(t('demo.receiveFailed', { error: res.error }));
  }
};

// ── 結清通知 ──
const settleTargets = computed(() => settleableOrders());
const settleOpen = ref(false);
const settlePick = ref('');
const openSettle = () => {
  settlePick.value = '';
  settleOpen.value = true;
};
const doSettle = () => {
  const orderNo = settlePick.value;
  const res = settleOrderCallback({ orderNo });
  if (res.ok) ElMessage.success(t('demo.settleDone', { orderNo }));
  settleOpen.value = false;
};

// ── 帳號通知 Email（規格 8.1 第 6、7 項文案）──
const emails = computed(() => allEmails().slice(0, 6));
const mailOpen = ref(null);
const loginUrl = `${location.origin}${location.pathname.replace(/internal\.html$/, '')}dealer.html`;
function mailText(m) {
  const dealerName = dealerById(m.dealerId)?.name ?? '';
  const footer = [
    '※ パスワードは第三者に知られないよう、お取り扱いにご注意ください。',
    '※ 本メールは配信専用です。ご返信いただいてもお答えできません。'
  ];
  if (m.type === EMAIL_TYPE.ACCOUNT_ISSUED) {
    return {
      subject: '【車両オークション】入札サイト アカウント発行のお知らせ',
      body: [
        `${dealerName} ご担当者様`,
        '',
        'いつもお世話になっております。',
        'このたび、車両オークション入札サイトのアカウントを発行いたしましたので、ご案内申し上げます。',
        '',
        `■ ログイン ID（Email）：${m.to}`,
        `■ パスワード：${m.password}`,
        `■ ログイン URL：${loginUrl}`,
        '',
        '本サイトでは、パスワードの変更および再発行のお手続きはご利用いただけません。パスワードをお忘れの場合、またはログインに 5 回失敗してアカウントがロックされた場合は、お手数ですが担当者までご連絡ください。',
        '',
        ...footer
      ].join('\n')
    };
  }
  return {
    subject: '【車両オークション】パスワード再発行のお知らせ',
    body: [
      `${dealerName} ご担当者様`,
      '',
      'いつもお世話になっております。',
      'ご登録のアカウントにつきまして、パスワードを再発行いたしましたので、ご案内申し上げます。',
      '',
      `■ ログイン ID（Email）：${m.to}`,
      `■ 新しいパスワード：${m.password}`,
      `■ ログイン URL：${loginUrl}`,
      '',
      '次回のログインより、上記の新しいパスワードをご利用ください。これまでのパスワードはご利用いただけません。',
      'なお、アカウントがロックされている場合、本メールではロックは解除されません。ロック解除が必要な場合は、担当者までご連絡ください。',
      '',
      ...footer
    ].join('\n')
  };
}

// ── 其他 ──
const openDealerSite = () => window.open(loginUrl, '_blank');

async function doReset() {
  try {
    await ElMessageBox.confirm(t('demo.resetConfirm'), t('demo.resetData'), {
      type: 'warning',
      confirmButtonText: t('demo.resetData')
    });
  } catch {
    return;
  }
  resetDemoData();
}
</script>

<style lang="scss" scoped>
.demo-console {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.demo-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 999px;
  font-size: 12px;
  line-height: 16px;
  color: #ffffff;
  background: #2c2c37;
  box-shadow: 0 6px 18px rgba(20, 24, 30, 0.22);
  cursor: pointer;
  opacity: 0.86;

  &:hover {
    opacity: 1;
  }

  .toggle-offset {
    padding: 1px 6px;
    border-radius: 999px;
    font-size: 11px;
    background: var(--el-color-primary);
  }
}

.demo-body {
  width: 260px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding: 12px 14px 14px;
  border: 1px solid #eceff3;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(20, 24, 30, 0.16);

  .demo-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
    color: #222222;
  }

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 12px;
    line-height: 18px;
    color: #666666;

    b {
      font-size: 12.5px;
      color: #222222;
    }
  }

  .time-row {
    flex-direction: column;
    gap: 2px;
  }

  .offset {
    color: var(--el-color-primary);
  }

  .section {
    margin: 0 0 8px;
    font-size: 11.5px;
    line-height: 16px;
    color: #909399;
  }

  .hint {
    margin: 0;
    font-size: 11px;
    line-height: 16px;
    color: #b6bcc4;
  }

  .full {
    width: 100%;
    margin: 0 0 8px;
  }

  .tail {
    margin-left: 2px;
    font-size: 11px;
    opacity: 0.7;
  }

  .switch-row {
    margin: 2px 0 0;
  }

  .btns {
    display: flex;
    gap: 6px;
    margin: 8px 0 4px;

    :deep(.el-button) {
      flex: 1;
      margin: 0;
    }
  }

  .el-divider {
    margin: 12px 0;
  }

  .mail-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .mail {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 8px;
    border-radius: 8px;
    font-size: 11px;
    line-height: 15px;
    color: #606266;
    background: #f7f8fa;
    cursor: pointer;

    &:hover {
      background: #eef3ff;
    }

    b {
      font-size: 11.5px;
      color: #222222;
    }

    .sub {
      color: #a8abb2;
    }
  }
}

.num {
  font-variant-numeric: tabular-nums;
}

.dialog-hint {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 20px;
  color: #909399;
}

.settle-list {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;

  :deep(.el-radio) {
    height: auto;
    margin-right: 0;
    padding: 10px 12px;
  }
}

.settle-car {
  margin-left: 10px;
  font-size: 12.5px;
  color: #909399;
}

.mail-meta {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 18px;
  color: #909399;
}

.mail-body {
  margin: 0;
  padding: 14px 16px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  color: #222222;
  background: #f7f8fa;
}

.demo-fade-enter-active,
.demo-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.demo-fade-enter-from,
.demo-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
