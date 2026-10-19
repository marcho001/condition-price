import { onMounted, onUnmounted, nextTick } from 'vue';

export function useEnterEvent(eventHanler, delay = 1000) {
  let lastCall = 0;
  let timer = null;
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event?.target?.className?.includes('el-select__input')) {
      console.log('====');
      const now = Date.now();
      if (now - lastCall >= delay && !timer) {
        nextTick(() => {
          timer = setTimeout(() => {
            eventHanler && eventHanler?.();
            console.log(Date.now());
            lastCall = now;
            clearTimeout(timer);
            timer = null;
          }, 0);
        });
      }
    }
    if (!timer) {
      console.log('正在等待中');
    }
  };

  onMounted(() => window.addEventListener('keydown', handleKeyDown, { capture: true }));
  onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));
}
