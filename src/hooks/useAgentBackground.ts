import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_IMAGE_KEY = 'agent_background_image_uri';

export const useAgentBackground = () => {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 加载背景图片
  useEffect(() => {
    const loadBackground = async () => {
      try {
        const uri = await AsyncStorage.getItem(BACKGROUND_IMAGE_KEY);
        if (uri) {
          setBackgroundImage(uri);
        }
      } catch (error) {
        console.error('Failed to load agent background image:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBackground();
  }, []);

  // 设置背景图片
  const setBackground = useCallback(async (uri: string) => {
    try {
      await AsyncStorage.setItem(BACKGROUND_IMAGE_KEY, uri);
      setBackgroundImage(uri);
    } catch (error) {
      console.error('Failed to save agent background image:', error);
    }
  }, []);

  // 清除背景图片
  const clearBackground = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(BACKGROUND_IMAGE_KEY);
      setBackgroundImage(null);
    } catch (error) {
      console.error('Failed to clear agent background image:', error);
    }
  }, []);

  return {
    backgroundImage,
    isLoading,
    setBackground,
    clearBackground,
  };
};
