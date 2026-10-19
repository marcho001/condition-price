import { createPinia } from 'pinia';

const pinia = createPinia();

export * from './modules/language';
export * from './modules/theme';
export * from './modules/dict';
export * from './modules/permission';
export * from './modules/listContext';
export * from './modules/vehicleSelection';
export default pinia;
