<template>
  <div>
    <div class="grid">
      <button v-for="(f, i) in files" :key="f.id" class="tile" type="button" @click="active = i">
        <span class="thumb">
          <img v-if="!isPdfFile(f)" :src="f.src" :alt="f.name" loading="lazy" />
          <span v-else class="pdf-mark fig">PDF</span>
        </span>
        <span class="name">{{ f.name }}</span>
      </button>
    </div>

    <teleport to="body">
      <div v-if="active !== null" class="ov" @click.self="active = null">
        <button class="ov-x" type="button" aria-label="close" @click="active = null">✕</button>
        <iframe v-if="isPdfFile(files[active]) && files[active].src.startsWith('data:application/pdf')"
                :src="files[active].src" :title="files[active].name" />
        <img v-else :src="files[active].src" :alt="files[active].name" />
        <p class="ov-cap">{{ files[active].name }}</p>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ files: { type: Array, required: true } })

const active = ref(null)
const isPdfFile = (f) => f.mime === 'application/pdf' && f.src.startsWith('data:application/pdf')
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 10px;
}

.tile {
  border: 1px solid var(--rule-soft);
  border-radius: var(--r-md);
  background: var(--card);
  padding: 0 0 8px;
  cursor: pointer;
  overflow: hidden;
  text-align: left;
}
.tile:hover { border-color: var(--bid); }

.thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  background: var(--sheet-2);
}
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

.pdf-mark {
  color: var(--seal);
  font-size: 17px;
  letter-spacing: 0.14em;
}

.name {
  display: block;
  padding: 7px 10px 0;
  font-size: 11.5px;
  color: var(--ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ov {
  position: fixed;
  inset: 0;
  z-index: 95;
  background: rgba(12, 15, 18, 0.94);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 46px 14px 54px;
}
.ov img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; }
.ov iframe { width: min(920px, 100%); height: 100%; border: none; border-radius: 6px; background: #fff; }
.ov-x {
  position: absolute;
  top: 14px; right: 14px;
  width: 40px; height: 40px;
  border: none; border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff; cursor: pointer; font-size: 15px;
}
.ov-cap {
  position: absolute;
  bottom: 16px; left: 0; right: 0;
  text-align: center;
  color: #cfd6ce;
  font-size: 12.5px;
  margin: 0;
}
</style>
