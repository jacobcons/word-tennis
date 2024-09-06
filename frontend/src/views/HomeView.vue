<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/utils.js'
import router from '@/router/index.js'

const nickname = ref('')
// create player and go to search view
async function start() {
  const { sessionId, nickname: nicknameResponse } = (
    await api.post<{ sessionId: string; nickname: string }>('/players', {
      nickname: nickname.value
    })
  ).data
  localStorage.setItem('sessionId', sessionId)
  localStorage.setItem('nickname', nicknameResponse)
  await router.push({ path: '/search' })
}
</script>

<template>
  <div class="flex h-screen w-screen items-center justify-center">
    <div class="mx-auto flex max-w-lg flex-col items-center gap-y-6 text-center">
      <h1 class="">Word Tennis</h1>
      <p class="">
        This is a multiplayer browser game in which users must type related words back and fourth
        under timed pressure. For example 'wave' could be followed by 'ocean', 'crash', 'sine'
        etc...
      </p>
      <input
        v-model="nickname"
        type="text"
        placeholder="Enter Nickname..."
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
        @keydown.enter="start"
      />
      <button
        @click="start"
        type="submit"
        class="w-full rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 sm:w-auto dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      >
        Start
      </button>
    </div>
  </div>
</template>
