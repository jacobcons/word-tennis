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

const word = ref('')
function sendWord() {
  console.log(word.value)
}
</script>

<template>
  <div class="flex h-screen w-screen items-center justify-center">
    <div class="mx-auto flex w-96 max-w-full flex-col items-center gap-y-16 px-4">
      <h2 class="text-2xl">John's Turn (you)</h2>
      <span class="text-8xl">{{ countdown }}</span>
      <form @submit.prevent="sendWord" class="w-full">
        <input
          v-model="word"
          type="text"
          placeholder="Type Word..."
          class="text-small mb-6 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
          required
        />
      </form>
    </div>
  </div>
</template>
