<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api, gameData, socket } from '@/utils.js'
import { useRoute } from 'vue-router'

const route = useRoute()

// timer variables
const countdownTimeLeft = ref(gameData.value.COUNTDOWN_TIME_S)
const TURN_TIME_S = gameData.value.TURN_TIME_S
const turnTimeLeft = ref(TURN_TIME_S)
const turnTimeBarWidth = ref(100)

// turn variables
const currentPlayerIndex = ref(0)
const currentPlayer = computed(() => gameData.value.players)

onMounted(() => {
  // start countdown game timer
  const countdownIntervalId = setInterval(() => {
    countdownTimeLeft.value -= 1
    if (countdownTimeLeft.value == 0) {
      clearInterval(countdownIntervalId)

      // start turn timer when countdown is done
      const turnTimeIntervalId = setInterval(() => {
        turnTimeLeft.value -= 1
        if (turnTimeLeft.value == 0) {
          clearInterval(turnTimeIntervalId)
        }
      }, 1000)

      // turn timer bar
      const TICK_LENGTH_MS = 5
      const DECREASE_PER_TICK = TICK_LENGTH_MS / 50
      const turnTimeBarIntervalId = setInterval(() => {
        turnTimeBarWidth.value -= DECREASE_PER_TICK
        if (turnTimeBarWidth.value <= 0) {
          clearInterval(turnTimeBarIntervalId)
        }
      }, TICK_LENGTH_MS)
    }
  }, 1000)

  // turn
})

const word = ref('')
function sendWord() {
  console.log(word.value)
}

const currentWord = ref('')
</script>

<template>
  <div class="flex h-screen w-screen items-center justify-center">
    <div class="mx-auto flex w-96 max-w-full flex-col items-center gap-y-20 px-4">
      <h2 class="text-2xl">John's Turn (you)</h2>
      <span class="text-8xl">{{ countdownTimeLeft > 0 ? countdownTimeLeft : currentWord }}</span>
      <form @submit.prevent="sendWord" class="w-full">
        <div class="mb-1 flex justify-between">
          <span class="text-base font-medium text-blue-700 dark:text-white">Timer</span>
          <span class="text-sm font-medium text-blue-700 dark:text-white">{{
            `${turnTimeLeft}s`
          }}</span>
        </div>
        <div class="mb-2 h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            class="h-2.5 rounded-full bg-blue-600"
            :style="{ width: `${turnTimeBarWidth}%` }"
          ></div>
        </div>
        <input
          v-model="word"
          type="text"
          placeholder="Type Word..."
          class="text-small block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
          required
        />
      </form>
    </div>
  </div>
</template>
