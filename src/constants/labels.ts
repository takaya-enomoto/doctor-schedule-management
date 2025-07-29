// アプリケーション全体で使用するラベル定数

export const LABELS = {
  // アプリケーション名
  APP_NAME: '医師出勤管理',
  
  // メニュー・ボタンラベル
  MENU: {
    ADD_DOCTOR: '+ 医師追加',
    ADD_LEAVE_REQUEST: '+ 休み希望',
    ADD_ONETIME_WORK: '+ 単発勤務',
    ADD_ONCALL: '+ オンコール',
    ADD_NURSE_ONCALL: '+ 看護師オンコール',
    DATA_MANAGEMENT: '📁 データ管理',
    PRINT: '🖨️ 印刷',
  },

  // 医師関連
  DOCTOR: {
    TITLE: '医師',
    FULL_TIME: '常勤',
    PART_TIME: '非常勤',
    NAME: '医師名',
    TYPE: '勤務形態',
    LOCATION: '勤務地',
    MAIN_HOSPITAL: '本院',
    BRANCH_HOSPITAL: '分院',
    REGISTERED_DOCTORS: '登録済み医師',
    NO_DOCTORS: 'まだ医師が登録されていません。',
  },

  // オンコール関連
  ONCALL: {
    TITLE: 'オンコール',
    DOCTOR_ONCALL: '医師オンコール',
    NURSE_ONCALL: '看護師オンコール',
    DATE: '日付',
    DOCTOR_NAME: '医師名',
    NURSE_NAME: '看護師名',
    LOCATION: '場所',
    SHIFT_TYPE: 'シフト種別',
    DAY_SHIFT: '日勤',
    NIGHT_SHIFT: '夜勤',
    ALL_DAY: '終日',
    DESCRIPTION: '備考',
    REGISTERED_ONCALLS: '登録済みオンコール',
    NO_ONCALLS: 'まだオンコールが登録されていません。',
  },

  // スケジュール関連
  SCHEDULE: {
    TITLE: 'スケジュール',
    START_TIME: '開始時間',
    END_TIME: '終了時間',
    WORK_DAYS: '勤務曜日',
    START_DATE: '開始日',
    END_DATE: '終了日',
    REGISTERED_SCHEDULES: '登録済みスケジュール',
    NO_SCHEDULES: 'まだスケジュールが登録されていません。',
  },

  // 休み希望関連
  LEAVE_REQUEST: {
    TITLE: '休み希望',
    DATE: '希望日',
    REGISTERED_REQUESTS: '登録済み休み希望',
    NO_REQUESTS: 'まだ休み希望が登録されていません。',
  },

  // 単発勤務関連
  ONETIME_WORK: {
    TITLE: '単発勤務',
    DATE: '勤務日',
    REGISTERED_WORK: '登録済み単発勤務',
    NO_WORK: 'まだ単発勤務が登録されていません。',
  },

  // 曜日
  WEEKDAYS: {
    MONDAY: '月',
    TUESDAY: '火',
    WEDNESDAY: '水',
    THURSDAY: '木',
    FRIDAY: '金',
    SATURDAY: '土',
    SUNDAY: '日',
  },

  // 月名
  MONTHS: {
    1: '1月',
    2: '2月',
    3: '3月',
    4: '4月',
    5: '5月',
    6: '6月',
    7: '7月',
    8: '8月',
    9: '9月',
    10: '10月',
    11: '11月',
    12: '12月',
  },

  // 共通操作
  ACTIONS: {
    ADD: '追加',
    EDIT: '編集',
    DELETE: '削除',
    SAVE: '保存',
    CANCEL: 'キャンセル',
    CLOSE: '閉じる',
    CONFIRM: '確認',
    REGISTER: '登録',
    UPDATE: '更新',
  },

  // Google Drive関連
  GOOGLE_DRIVE: {
    TITLE: 'Google Drive 連携',
    INITIALIZE: 'Google Drive API 初期化',
    SIGNIN: 'Google Driveにサインイン',
    SIGNOUT: 'サインアウト',
    SAVE_TO_DRIVE: 'Google Driveに保存',
    LOAD_FROM_DRIVE: 'Google Driveから読み込み',
    AUTO_SAVE: 'Google Drive自動保存',
    FILE_LIST: 'ファイル一覧を表示',
    STATUS: {
      API_LOADED: 'API読み込み',
      INITIALIZED: '初期化',
      SIGNED_IN: 'サインイン',
    }
  },

  // データ管理関連
  DATA_MANAGEMENT: {
    TITLE: 'データ管理',
    OVERVIEW: '現在のデータ概要',
    TOTAL: '合計',
    LOCAL_FILE: 'ローカルファイル管理',
    EXPORT: 'JSONファイルをダウンロード',
    IMPORT: 'JSONファイルを選択',
    BACKUP: 'バックアップ',
    RESTORE: '復元',
    REPLACE_MODE: '置き換え',
    MERGE_MODE: 'マージ',
  },

  // メッセージ
  MESSAGES: {
    SUCCESS: '成功',
    ERROR: 'エラー',
    LOADING: '読み込み中...',
    SAVING: '保存中...',
    SAVED: '保存完了',
    DELETED: '削除しました',
    REGISTERED: '登録しました',
    UPDATED: '更新しました',
  }
} as const

// 型定義をエクスポート
export type LabelKeys = keyof typeof LABELS