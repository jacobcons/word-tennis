<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/utils.js'

const nickname = ref('')
async function start() {
  const { sessionId } = (
    await api.post<{ sessionId: string }>('/players', {
      nickname: nickname.value
    })
  ).data
  localStorage.setItem('sessionId', sessionId)
}
</script>

<template>
  <div class="mx-auto mt-12 max-w-lg text-center">
    <h1 class="mb-6">Word Tennis</h1>
    <p class="mb-6">
      This is a multiplayer browser game in which users must type related words back and fourth
      under timed pressure. For example 'wave' could be followed by 'ocean', 'crash', 'sine' etc...
    </p>
    <input
      v-model="nickname"
      type="text"
      placeholder="Enter Nickname..."
      class="mb-6 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
    />
    <button
      @click="start"
      type="submit"
      class="w-full rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 sm:w-auto dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
    >
      Start
    </button>
  </div>
</template>
