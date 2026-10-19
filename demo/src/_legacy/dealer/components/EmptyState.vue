<template>
  <div class="empty">
    <div class="mark" aria-hidden="true" />
    <h3>{{ title }}</h3>
    <p>{{ desc }}</p>
    <slot />
  </div>
</template>

<script setup>
defineProps({ title: String, desc: String })
</script>
