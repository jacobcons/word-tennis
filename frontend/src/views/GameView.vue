<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, socket } from '@/utils.js'

const countdown = ref(3)
const intervalId = setInterval(() => {
  countdown.value -= 1
  if (countdown.value == 0) {
    clearInterval(intervalId)
  }
}, 1000)
</script>

<template>
  <div class="flex h-screen w-screen items-center justify-center">
    <div class="mx-auto flex max-w-lg flex-col items-center gap-y-6">
      <span class="text-2xl">John's Turn (you)</span>
      <span class="text-4xl">{{ countdown }}</span>
    </div>
  </div>
</template>
