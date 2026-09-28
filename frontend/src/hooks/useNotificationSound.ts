/**
 * Hook to play notification sounds for important operations
 * Centralized sound management for consistent audio feedback
 */

export type NotificationSoundType = 'success' | 'info' | 'warning' | 'urgent';

const SOUND_VOLUMES: Record<NotificationSoundType, number> = {
  success: 0.6,
  info: 0.7,
  warning: 0.8,
  urgent: 1.0,
};

export const useNotificationSound = () => {
  const playSound = (type: NotificationSoundType = 'info') => {
    try {
      const audio = new Audio('/chime.mp3');
      audio.volume = SOUND_VOLUMES[type];
      audio.play().catch((error) => {
        console.warn('Audio play failed:', error);
      });
    } catch (error) {
      console.warn('Audio playback not supported:', error);
    }
  };

  const playSuccess = () => playSound('success');
  const playInfo = () => playSound('info');
  const playWarning = () => playSound('warning');
  const playUrgent = () => playSound('urgent');

  return {
    playSound,
    playSuccess,
    playInfo,
    playWarning,
    playUrgent,
  };
};
