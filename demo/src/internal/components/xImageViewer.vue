<template>
  <div class="custom-image-viewer" v-if="visible">
    <div class="viewer-mask" @click="close"></div>
    <div class="viewer-wrapper">
      <div class="viewer-header">
        <div class="viewer-title">{{ title }}</div>
        <button class="viewer-close" @click="close" v-if="showClose">×</button>
      </div>

      <div class="viewer-body">
        <div class="viewer-container" ref="containerRef" @wheel="handleWheel">
          <div
            class="viewer-image-wrapper"
            ref="imageWrapperRef"
            :style="wrapperStyle"
            @mousedown="handleMouseDown"
          >
            <img :src="currentUrl" class="viewer-image" />
          </div>
        </div>

        <!-- 导航按钮 -->
        <button class="viewer-nav viewer-nav-prev" @click="prev">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <button class="viewer-nav viewer-nav-next" @click="next">
          <el-icon><ArrowRight /></el-icon>
        </button>
      </div>

      <div class="viewer-footer">
        <!-- 图片指示器 -->
        <div class="viewer-indicators">
          <span
            v-for="(_, index) in urlList"
            :key="index"
            class="viewer-indicator"
            :class="{ active: index === currentIndex }"
            @click="currentIndex = index"
          />
        </div>

        <!-- 操作栏 -->
        <div class="viewer-actions">
          <button class="viewer-action" @click="zoom(0.2)">
            <el-icon><ZoomIn /></el-icon>
          </button>
          <button class="viewer-action" @click="zoom(-0.2)">
            <el-icon><ZoomOut /></el-icon>
          </button>
          <button class="viewer-action" @click="reset">
            <el-icon><Refresh /></el-icon>
          </button>
          <button class="viewer-action" @click="rotate(-90)">
            <el-icon><RefreshLeft /></el-icon>
          </button>
          <button class="viewer-action" @click="rotate(90)">
            <el-icon><RefreshRight /></el-icon>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Refresh,
  RefreshLeft,
  RefreshRight
} from '@element-plus/icons-vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  urlList: {
    type: Array,
    default: () => []
  },
  initialIndex: {
    type: Number,
    default: 0
  },
  title: {
    type: String,
    default: ''
  },
  showClose: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close', 'update:visible']);

const currentIndex = ref(props.initialIndex);
const scale = ref(1);
const rotation = ref(0);
const translate = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const startPos = ref({ x: 0, y: 0 });

const currentUrl = computed(() => {
  return props.urlList[currentIndex.value] || '';
});

const wrapperStyle = computed(() => {
  return {
    transform: `translate(${translate.value.x}px, ${translate.value.y}px) scale(${scale.value}) rotate(${rotation.value}deg)`,
    transition: isDragging.value ? 'none' : 'transform 0.2s ease'
  };
});

const close = () => {
  emit('update:visible', false);
  emit('close');
  reset();
};

const prev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    resetTransform();
  } else {
    currentIndex.value = props.urlList.length - 1;
  }
};

const next = () => {
  if (currentIndex.value < props.urlList.length - 1) {
    currentIndex.value++;
    resetTransform();
  } else {
    currentIndex.value = 0;
  }
};

const zoom = (delta) => {
  const newScale = Math.max(0.1, Math.min(5, scale.value + delta));
  scale.value = newScale;
};

const rotate = (angle) => {
  rotation.value = rotation.value + angle;
};

const reset = () => {
  scale.value = 1;
  rotation.value = 0;
  translate.value = { x: 0, y: 0 };
};

const resetTransform = () => {
  scale.value = 1;
  rotation.value = 0;
  translate.value = { x: 0, y: 0 };
};

const handleWheel = (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.2 : 0.2;
  zoom(delta);
};

const handleMouseDown = (e) => {
  isDragging.value = true;
  startPos.value = {
    x: e.clientX - translate.value.x,
    y: e.clientY - translate.value.y
  };
  e.preventDefault();

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

const handleMouseMove = (e) => {
  if (!isDragging.value) return;

  translate.value = {
    x: e.clientX - startPos.value.x,
    y: e.clientY - startPos.value.y
  };
};

const handleMouseUp = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
};

const handleKeydown = (e) => {
  if (!props.visible) return;

  switch (e.key) {
    case 'ArrowLeft':
      prev();
      break;
    case 'ArrowRight':
      next();
      break;
    case 'Escape':
      close();
      break;
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});

watch(
  () => props.visible,
  (newValue) => {
    if (newValue) {
      currentIndex.value = props.initialIndex;
      reset();
    }
  }
);

watch(
  () => props.initialIndex,
  (newValue) => {
    if (props.visible) {
      currentIndex.value = newValue;
      resetTransform();
    }
  }
);
</script>

<style lang="scss" scoped>
.custom-image-viewer {
  position: relative;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;

  .viewer-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 1);
  }

  .viewer-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .viewer-header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    color: #fff;
    z-index: 10;

    .viewer-title {
      font-size: 14px;
    }

    .viewer-close {
      width: 30px;
      height: 30px;
      border: none;
      background: transparent;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: #ccc;
      }
    }
  }

  .viewer-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;

    .viewer-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;

      &:active {
        cursor: grabbing;
      }

      .viewer-image-wrapper {
        position: relative;
        transform-origin: center center;
        will-change: transform;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;

        .viewer-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 22px;
        }
      }
    }

    .viewer-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      border: none;
      background: #606266;
      opacity: 0.8;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      z-index: 5;

      &.viewer-nav-prev {
        left: 40px;
      }

      &.viewer-nav-next {
        right: 40px;
      }
    }
  }

  .viewer-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 10;

    .viewer-actions {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-top: 15px;
      background-color: #606266;
      border-color: #fff;
      border-radius: 22px;
      height: 44px;
      padding: 0 23px;
      width: 282px;
      opacity: 0.8;

      .viewer-action {
        font-size: 23px;
        color: #fff;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    .viewer-indicators {
      display: flex;
      gap: 8px;

      .viewer-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: background-color 0.3s ease-in-out;

        &.active {
          background: #fff;
        }

        &:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      }
    }
  }
}
</style>
