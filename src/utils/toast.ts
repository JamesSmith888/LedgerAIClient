import Toast from 'react-native-toast-message';

/**
 * Toast 工具类 - 统一的消息提示封装
 * 替代原生的 Alert，提供更好的用户体验
 */

export const toast = {
  /**
   * 显示成功消息
   * @param message 消息内容
   * @param title 标题（可选）
   */
  success: (message: string, title: string = '成功') => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 50,
    });
  },

  /**
   * 显示错误消息
   * @param message 消息内容
   * @param title 标题（可选）
   */
  error: (message: string, title: string = '错误') => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
    });
  },

  /**
   * 显示信息消息
   * @param message 消息内容
   * @param title 标题（可选）
   */
  info: (message: string, title: string = '提示') => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 50,
    });
  },

  /**
   * 显示警告消息
   * @param message 消息内容
   * @param title 标题（可选）
   */
  warning: (message: string, title: string = '警告') => {
    Toast.show({
      type: 'error', // 使用 error 类型作为警告（可以自定义样式）
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3500,
      autoHide: true,
      topOffset: 50,
    });
  },

  /**
   * 隐藏当前显示的 Toast
   */
  hide: () => {
    Toast.hide();
  },
};

/**
 * Alert 兼容层 - 对于需要确认操作的场景，保留使用原生 Alert
 * 但对于简单的提示信息，推荐使用 toast
 */
export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  // 这里仍使用原生 Alert 来处理需要用户确认的场景
  const { Alert } = require('react-native');
  Alert.alert(
    title,
    message,
    [
      {
        text: '取消',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: '确定',
        onPress: onConfirm,
      },
    ],
    { cancelable: false }
  );
};
