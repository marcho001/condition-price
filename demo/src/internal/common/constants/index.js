/**
 * 公共常量
 */
export const APP_NAME = 'X STAR';

/**
 * 拍卖状态
 * 与后端 auctionStatus 对齐（见 API/auction-vehicle-management/*.yaml）
 */
export const AUCTION_STATUS = {
  /** 待排定拍卖 */
  PENDING: 10,
  /** 待开始（已排定、开始日未到） */
  NOT_STARTED: 15,
  /** 投标中 */
  BIDDING: 20,
  /** 已结标 */
  CLOSED: 30,
  /** 已决标 */
  AWARDED: 40,
  /** 已结清（软删除，不在任何列表呈现） */
  SETTLED: 50
};

/**
 * 轮次类型。三个列表只显示类型，不显示轮次序号
 */
export const ROUND_TYPE = {
  /** 首轮 */
  FIRST: 1,
  /** 加价轮（第 2 轮含以后一律显示加价轮） */
  ADDITIONAL: 2
};

/** 启用状态 */
export const ENABLE_FLAG = {
  DISABLED: 0,
  ENABLED: 1
};

/** 账号锁定状态 */
export const LOCKED_FLAG = {
  UNLOCKED: 0,
  LOCKED: 1
};

/**
 * 每页笔数下拉，本模块全部分页列表一致（规格 7.2）
 * 厂商管理不分页，不使用此常量
 */
export const PAGE_SIZES = [25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;

/** 拍卖期间默认天数：今日 ~ 今日 + 7 日 */
export const DEFAULT_AUCTION_DAYS = 7;

/** 附件上传限制（见 API 文档 /web/vehicle/attachment/upload） */
export const ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.pdf';
export const ATTACHMENT_EXT_LIST = ['jpg', 'jpeg', 'png', 'pdf'];
export const ATTACHMENT_MAX_SIZE = 20 * 1024 * 1024;

/**
 * 业务错误码（见 API yaml 的 Resp 说明）
 * 11xx 厂商与账号；12xx 车辆与收车通知；13xx 拍卖与轮次；15xx 成交与介接；16xx 催投
 */
export const BIZ_CODE = {
  SUCCESS: '0000',
  PARAM_ERROR: '1000',
  /** Email 已被其他厂商使用 */
  DEALER_EMAIL_DUPLICATED: '1101',
  /** 厂商不存在 */
  DEALER_NOT_FOUND: '1102',
  /** 该账号未锁定 */
  DEALER_NOT_LOCKED: '1103',
  /** 车辆不存在 */
  VEHICLE_NOT_FOUND: '1204',
  /** 车辆已排定拍卖，不可编辑 */
  VEHICLE_SCHEDULED: '1205',
  /** 附件不存在或不属于该车辆 */
  ATTACHMENT_NOT_FOUND: '1206',
  /** 附件格式不支持或大小超过限制 */
  ATTACHMENT_INVALID: '1207',
  /** 排定拍卖：有车辆不符合上架条件（见 data.failures），整批未上架 */
  SCHEDULE_VALIDATION_FAILED: '1301',
  /** 该轮已开始或已不是待开始，无法取消排定 */
  SCHEDULE_ALREADY_STARTED: '1305',
  /** 成交通知失败或结果未明，订单仍在已结标 */
  DEAL_NOTIFY_FAILED: '1501',
  /** 拍卖状态已变更 */
  AUCTION_STATUS_CHANGED: '1504',
  SYSTEM_ERROR: '9999'
};

/** 催投纪录的触发方式 */
export const URGE_TRIGGER_TYPE = {
  MANUAL: 'MANUAL',
  AUTO: 'AUTO'
};

/**
 * 页面权限
 *
 * 沿用既有 portal 权限机制：getPageButton 返回 ";" 分隔的权限码字符串，
 * 由 @/store/modules/permission 的 queryPermission 拆成数组后以 checkPermission 判断。
 */
export const PERMISSION_PAGE_URL = '/#/auction-management/auctionManagement/list';
export const PERMISSION_CODE = {
  /** 已决标 · 详细 */
  AWARDED_DETAIL: 'auction:awarded-detail',
  /** 已结标 tab */
  CLOSED_TAB: 'auction:closed-tab',
  /** 待开始 · 下架拍卖（取消排定） */
  CANCEL_SCHEDULE: 'auction:cancel-schedule',
  /** 拍卖进行中 · 催投 */
  URGE: 'auction:urge',
  /** 已结标 · 指定成交厂商 */
  DESIGNATE: 'auction:designate',
  /** 已结标 · 进入加价轮 */
  ADDITIONAL_ROUND: 'auction:additional-round'
};

/** 车辆详细弹窗的打开来源，决定可编辑性与是否显示拍卖信息 */
export const VEHICLE_DETAIL_SOURCE = {
  /** 车辆管理列表：可编辑、可上传/删除附件 */
  VEHICLE_LIST: 'vehicleList',
  /** 排定拍卖弹窗的「确认详细」：一律只读 */
  SCHEDULE_DIALOG: 'scheduleDialog',
  /** 拍卖管理 · 待开始：只读 + 拍卖信息区块 */
  AUCTION_PENDING: 'auctionPending',
  /** 拍卖管理 · 拍卖进行中：只读 + 拍卖信息区块 */
  AUCTION_ONGOING: 'auctionOngoing',
  /** 拍卖管理 · 已结标：只读 + 拍卖信息、出价纪录（本轮）、成交操作 */
  AUCTION_CLOSED: 'auctionClosed',
  /** 拍卖管理 · 已决标：只读 + 拍卖信息（成交轮）、出价纪录（各轮），无任何操作 */
  AUCTION_AWARDED: 'auctionAwarded'
};

/** 拍卖管理四个 tab */
export const AUCTION_TAB = {
  PENDING: 'pending',
  ONGOING: 'ongoing',
  CLOSED: 'closed',
  AWARDED: 'awarded'
};
