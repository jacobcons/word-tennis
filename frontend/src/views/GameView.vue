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
      <span class="text-3xl">John's Turn (you)</span>
      <span class="text-8xl">{{ countdown }}</span>
      <form @submit.prevent="sendWord">
        <input
          v-model="word"
          type="text"
          placeholder="Enter Nickname..."
          class="mb-6 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
          required
          @keydown.enter="start"
        />
      </form>
    </div>
  </div>
</template>
