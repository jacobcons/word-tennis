<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import { addBearerTokenToAxios, api, connectToWsServer } from '@/utils.js'
import router from '@/router/index.js'
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator'

const nickname = ref('')
// create player and go to search view
async function start() {
  const currentSessionId = localStorage.getItem('sessionId')
  // session invalid => create new player & session => update existing player's nickname
  const { newSessionId } = (
    await api.put('players', {
      nickname: nickname.value,
      currentSessionId
    })
  ).data

  if (newSessionId) {
    localStorage.setItem('sessionId', newSessionId)
    addBearerTokenToAxios(newSessionId)
    connectToWsServer(newSessionId)
  }

  localStorage.setItem('nickname', nickname.value)
  await router.push({ path: '/search' })
}

function setRandomNickname() {
  const MAX_NICKNAME_LENGTH = 30
  nickname.value = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] }).slice(
    0,
    MAX_NICKNAME_LENGTH
  )
}
</script>

<template>
  <div class="flex h-screen w-screen items-center justify-center">
    <div class="mx-auto flex max-w-2xl flex-col items-center gap-y-6 px-4 text-center">
      <h1 class="">Word Tennis</h1>
      <p class="">
        This is a game in which users must type related words back and fourth under timed pressure.
        For example 'wave' could be followed by 'ocean', 'crash', 'sine' etc...
      </p>
      <p class="">
        Simply enter a nickname below, and hit start to get paired with a random player.
      </p>
      <form @submit.prevent="start" class="w-full">
        <div class="relative">
          <input
            v-model="nickname"
            type="text"
            placeholder="Enter Nickname..."
            class="mb-6 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            required
            maxlength="30"
          />
          <img
            src="/dice.svg"
            width="24"
            alt=""
            class="absolute right-4 top-1/2 -translate-y-1/2 transform cursor-pointer"
            @click="setRandomNickname"
          />
        </div>
        <input
          type="submit"
          class="cursor-pointer rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 sm:w-auto"
          value="Start"
        />
      </form>
    </div>
  </div>
</template>
