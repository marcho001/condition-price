<template>
  <div class="pg">
    <div ref="track" class="track" @scroll.passive="onScroll">
      <button
        v-for="(p, i) in photos"
        :key="p.id"
        class="slide"
        type="button"
        :aria-label="p.name"
        @click="lightbox = i"
      >
        <img :src="p.src" :alt="p.name" loading="lazy" />
      </button>
    </div>

    <div class="bar">
      <span class="name">{{ photos[index]?.name }}</span>
      <span class="idx fig">{{ t('detail.photoCount', { i: index + 1, n: photos.length }) }}</span>
    </div>

    <div class="thumbs">
      <button
        v-for="(p, i) in photos"
        :key="`t-${p.id}`"
        type="button"
        class="thumb"
        :class="{ on: i === index }"
        @click="scrollTo(i)"
      >
        <img :src="p.src" :alt="p.name" loading="lazy" />
      </button>
    </div>

    <teleport to="body">
      <div v-if="lightbox !== null" class="lb" @click.self="lightbox = null">
        <button class="lb-x" type="button" :aria-label="t('common.close')" @click="lightbox = null">✕</button>
        <button class="lb-nav prev" type="button" aria-label="prev" @click="step(-1)">‹</button>
        <img :src="photos[lightbox].src" :alt="photos[lightbox].name" />
        <button class="lb-nav next" type="button" aria-label="next" @click="step(1)">›</button>
        <p class="lb-cap">
          {{ photos[lightbox].name }}
          <span class="fig">{{ t('detail.photoCount', { i: lightbox + 1, n: photos.length }) }}</span>
        </p>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({ photos: { type: Array, required: true } })

const { t } = useI18n()
const track = ref(null)
const index = ref(0)
const lightbox = ref(null)

function onScroll() {
  const el = track.value
  if (!el) return
  index.value = Math.round(el.scrollLeft / el.clientWidth)
}

function scrollTo(i) {
  track.value?.scrollTo({ left: i * track.value.clientWidth, behavior: 'smooth' })
}

function step(d) {
  const n = props.photos.length
  lightbox.value = (lightbox.value + d + n) % n
}

function onKey(e) {
  if (lightbox.value === null) return
  if (e.key === 'Escape') lightbox.value = null
  if (e.key === 'ArrowRight') step(1)
  if (e.key === 'ArrowLeft') step(-1)
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.pg { background: var(--card); border-radius: var(--r-lg); overflow: hidden; box-shadow: var(--shadow-card); }

.track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.track::-webkit-scrollbar { display: none; }

.slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  border: none;
  padding: 0;
  background: var(--sheet-2);
  aspect-ratio: 4 / 3;
  cursor: zoom-in;
}
.slide img { width: 100%; height: 100%; object-fit: cover; display: block; }

@media (min-width: 700px) {
  .slide { aspect-ratio: 16 / 9; max-height: 440px; }
}

.bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--rule-soft);
}
.bar .name { font-size: 12.5px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar .idx { font-size: 12px; color: var(--ink-3); flex: none; }

.thumbs {
  display: flex;
  gap: 6px;
  padding: 10px 12px 12px;
  overflow-x: auto;
  scrollbar-width: thin;
}
.thumb {
  flex: 0 0 62px;
  height: 46px;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  overflow: hidden;
  padding: 0;
  background: var(--sheet-2);
  cursor: pointer;
  opacity: 0.62;
}
.thumb.on { opacity: 1; border-color: var(--bid); }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* ライトボックス */
.lb {
  position: fixed;
  inset: 0;
  z-index: 95;
  background: rgba(12, 15, 18, 0.94);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 44px 12px 60px;
}
.lb img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; }

.lb-x, .lb-nav {
  position: absolute;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 20px;
  line-height: 1;
}
.lb-x { top: 14px; right: 14px; font-size: 15px; }
.lb-nav.prev { left: 12px; top: 50%; transform: translateY(-50%); }
.lb-nav.next { right: 12px; top: 50%; transform: translateY(-50%); }

.lb-cap {
  position: absolute;
  bottom: 18px;
  left: 0;
  right: 0;
  text-align: center;
  color: #cfd6ce;
  font-size: 12.5px;
  margin: 0;
}
.lb-cap span { margin-left: 10px; color: #8e9a90; }
</style>
