/**
 * 统一的图标组件
 * 封装 react-native-vector-icons，提供一致的图标使用接口
 */
import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../constants/theme';

export type IconType = 'ionicons' | 'material' | 'material-community' | 'font-awesome' | 'font-awesome5' | 'feather';

interface IconProps {
  type?: IconType;
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

/**
 * Icon 组件
 * 
 * 使用示例：
 * <Icon name="book" size={24} color={Colors.primary} />
 * <Icon type="feather" name="edit" size={20} />
 */
export const Icon: React.FC<IconProps> = ({
  type = 'ionicons',
  name,
  size = 24,
  color = Colors.text,
  style,
}) => {
  const iconProps = { name, size, color, style };

  switch (type) {
    case 'material':
      return <MaterialIcons {...iconProps} />;
    case 'material-community':
      return <MaterialCommunityIcons {...iconProps} />;
    case 'font-awesome':
      return <FontAwesome {...iconProps} />;
    case 'font-awesome5':
      return <FontAwesome5 {...iconProps} />;
    case 'feather':
      return <Feather {...iconProps} />;
    case 'ionicons':
    default:
      return <Ionicons {...iconProps} />;
  }
};

/**
 * 预定义的常用图标（使用 Ionicons）
 */
export const AppIcons = {
  // 导航
  home: 'home',
  homeOutline: 'home-outline',
  list: 'list',
  listOutline: 'list-outline',
  person: 'person',
  personOutline: 'person-outline',
  
  // 账本相关
  book: 'book',
  bookOutline: 'book-outline',
  wallet: 'wallet',
  walletOutline: 'wallet-outline',
  people: 'people',
  peopleOutline: 'people-outline',
  business: 'business',
  businessOutline: 'business-outline',
  
  // 操作
  add: 'add',
  addCircle: 'add-circle',
  addCircleOutline: 'add-circle-outline',
  remove: 'remove',
  removeCircle: 'remove-circle',
  removeCircleOutline: 'remove-circle-outline',
  create: 'create',
  createOutline: 'create-outline',
  trash: 'trash',
  trashOutline: 'trash-outline',
  close: 'close',
  closeCircle: 'close-circle',
  checkmark: 'checkmark',
  checkmarkCircle: 'checkmark-circle',
  
  // 导航箭头
  arrowBack: 'arrow-back',
  arrowForward: 'arrow-forward',
  chevronBack: 'chevron-back',
  chevronForward: 'chevron-forward',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
  
  // 功能
  settings: 'settings',
  settingsOutline: 'settings-outline',
  search: 'search',
  searchOutline: 'search-outline',
  filter: 'filter',
  filterOutline: 'filter-outline',
  refresh: 'refresh',
  refreshOutline: 'refresh-outline',
  share: 'share',
  shareOutline: 'share-outline',
  
  // 信息
  information: 'information',
  informationCircle: 'information-circle',
  help: 'help',
  helpCircle: 'help-circle',
  alert: 'alert',
  alertCircle: 'alert-circle',
  warning: 'warning',
  
  // 状态
  eye: 'eye',
  eyeOutline: 'eye-outline',
  eyeOff: 'eye-off',
  eyeOffOutline: 'eye-off-outline',
  lock: 'lock-closed',
  lockOutline: 'lock-closed-outline',
  unlock: 'lock-open',
  unlockOutline: 'lock-open-outline',
  
  // 日期时间
  calendar: 'calendar',
  calendarOutline: 'calendar-outline',
  time: 'time',
  timeOutline: 'time-outline',
  
  // 支付
  card: 'card',
  cardOutline: 'card-outline',
  cash: 'cash',
  cashOutline: 'cash-outline',
  
  // 统计
  stats: 'stats-chart',
  statsOutline: 'stats-chart-outline',
  trending: 'trending-up',
  trendingDown: 'trending-down',
  pie: 'pie-chart',
  pieOutline: 'pie-chart-outline',
  
  // 其他
  more: 'ellipsis-horizontal',
  moreVertical: 'ellipsis-vertical',
  menu: 'menu',
  menuOutline: 'menu-outline',
  star: 'star',
  starOutline: 'star-outline',
  heart: 'heart',
  heartOutline: 'heart-outline',
  mail: 'mail',
  mailOutline: 'mail-outline',
  send: 'send',
  sendOutline: 'send-outline',
  download: 'download',
  downloadOutline: 'download-outline',
  upload: 'cloud-upload',
  uploadOutline: 'cloud-upload-outline',
  
  // 数据导出相关
  codeSlash: 'code-slash',
  gridOutline: 'grid-outline',
  documentOutline: 'document-outline',
  cloudUploadOutline: 'cloud-upload-outline',
  cloudDownloadOutline: 'cloud-download-outline',
  notificationsOutline: 'notifications-outline',
  colorPaletteOutline: 'color-palette-outline',
  informationCircleOutline: 'information-circle-outline',
  
  // 邀请相关
  link: 'link',
  linkOutline: 'link-outline',
  qrCode: 'qr-code',
  qrCodeOutline: 'qr-code-outline',
  
  // 登录注册
  logIn: 'log-in',
  logInOutline: 'log-in-outline',
  logOut: 'log-out',
  logOutOutline: 'log-out-outline',
};

/**
 * Feather 图标预设（更简洁的设计）
 */
export const FeatherIcons = {
  edit: 'edit',
  edit2: 'edit-2',
  edit3: 'edit-3',
  trash: 'trash',
  trash2: 'trash-2',
  plus: 'plus',
  plusCircle: 'plus-circle',
  minus: 'minus',
  minusCircle: 'minus-circle',
  check: 'check',
  checkCircle: 'check-circle',
  x: 'x',
  xCircle: 'x-circle',
  arrowLeft: 'arrow-left',
  arrowRight: 'arrow-right',
  chevronLeft: 'chevron-left',
  chevronRight: 'chevron-right',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
  home: 'home',
  user: 'user',
  users: 'users',
  book: 'book',
  bookOpen: 'book-open',
  settings: 'settings',
  search: 'search',
  filter: 'filter',
  calendar: 'calendar',
  clock: 'clock',
  creditCard: 'credit-card',
  dollarSign: 'dollar-sign',
  trendingUp: 'trending-up',
  trendingDown: 'trending-down',
  pieChart: 'pie-chart',
  barChart: 'bar-chart',
  info: 'info',
  helpCircle: 'help-circle',
  alertCircle: 'alert-circle',
  eye: 'eye',
  eyeOff: 'eye-off',
  lock: 'lock',
  unlock: 'unlock',
  mail: 'mail',
  send: 'send',
  share: 'share-2',
  download: 'download',
  upload: 'upload',
  link: 'link',
  logIn: 'log-in',
  logOut: 'log-out',
  more: 'more-horizontal',
  moreVertical: 'more-vertical',
  menu: 'menu',
  star: 'star',
  heart: 'heart',
  messageSquare: 'message-square',
  messageCircle: 'message-circle',
  thumbsUp: 'thumbs-up',
  thumbsDown: 'thumbs-down',
};
