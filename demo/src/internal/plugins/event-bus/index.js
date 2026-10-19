import eventBus from '@/common/utils/event-bus';

export default {
  install: (app, options) => {
    app.provide('$eventBus', (app.config.globalProperties.$eventBus = eventBus));
  }
};
