<template>
  <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'list'">
      <path d="M3.5 13.2 5.3 8.4A2.2 2.2 0 0 1 7.4 7h9.2a2.2 2.2 0 0 1 2.1 1.4l1.8 4.8" />
      <path d="M3.5 13.2h17V18h-2.6v-1.7H6.1V18H3.5z" />
      <path d="M7 10.6h10" />
    </template>
    <template v-else-if="name === 'mybids'">
      <path d="M4 11.6V5.2A1.2 1.2 0 0 1 5.2 4h6.4L20 12.4 12.4 20z" />
      <circle cx="8" cy="8" r="1.1" />
    </template>
    <template v-else-if="name === 'won'">
      <circle cx="12" cy="12" r="8" />
      <path d="M8.4 12.3l2.4 2.4 4.8-5" />
    </template>
    <template v-else-if="name === 'notices'">
      <path d="M6 10.4a6 6 0 0 1 12 0c0 3.7 1.1 4.9 1.7 5.5H4.3C4.9 15.3 6 14.1 6 10.4z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </template>
  </svg>
</template>

<script setup>
defineProps({ name: { type: String, required: true } })
</script>
