<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="format max-w-none">
    <RouterView />
    <footer class="absolute bottom-4 left-1/2 -translate-x-1/2 transform text-center text-sm">
      Made By
      <a
        href="https://jacobcons.com"
        class="text-blue-700 no-underline hover:underline"
        target="_blank"
        >jacobcons.com</a
      >
    </footer>
  </div>
</template>
