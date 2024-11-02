<script setup lang="ts">
import { nextTick, computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { api, generatePlayerBracketText, socket } from '@/utils.js'
import { useRoute } from 'vue-router'
import { gameData } from '@/stores.js'
import { useAnimatedTripleDotMessage } from '@/composables.js'
import router from '@/router/index.js'

const route = useRoute()

/* COUNTDOWN AND TURN TIMER */
const countdownTimeLeft = ref(gameData.value.COUNTDOWN_TIME_S)
const TURN_TIME_S = gameData.value.TURN_TIME_S
const turnTimeLeft = ref(TURN_TIME_S)
const turnTimeBarWidth = ref(100)
let turnTimeIntervalId: number
let turnTimeBarIntervalId: number
const wordInput = useTemplateRef<HTMLInputElement>('word-input')

onMounted(() => {
  // start countdown game timer
  const countdownIntervalId = setInterval(() => {
    countdownTimeLeft.value -= 1
    // when countdown reaches 0 => stop it, and start turn timer, focus on input
    if (countdownTimeLeft.value == 0) {
      clearInterval(countdownIntervalId)
      startTurnTimer()
      focusOnWordInput()
    }
  }, 1000)
})

function startTurnTimer() {
  // start ticking down turn time
  turnTimeIntervalId = setInterval(() => {
    turnTimeLeft.value -= 1
    if (turnTimeLeft.value == 0) {
      clearInterval(turnTimeIntervalId)
    }
  }, 1000)

  // start ticking down bar
  const TICK_LENGTH_MS = 5
  const DECREASE_PER_TICK = TICK_LENGTH_MS / 50
  turnTimeBarIntervalId = setInterval(() => {
    turnTimeBarWidth.value -= DECREASE_PER_TICK
    if (turnTimeBarWidth.value <= 0) {
      clearInterval(turnTimeBarIntervalId)
    }
  }, TICK_LENGTH_MS)
  return { turnTimeIntervalId, turnTimeBarIntervalId }
}

function focusOnWordInput() {
  nextTick(() => {
    if (wordInput.value) {
      wordInput.value.focus()
    }
  })
}

/* TURN MANAGEMENT */
const currentPlayerIndex = ref(0)
const currentPlayer = computed(() => gameData.value.players[currentPlayerIndex.value])
const currentWord = ref('')
const wordToSend = ref('')
const enterSingleWordError = ref(false)
const isProcessingWord = ref(false)
const { animatedTripleDotMessage: evaluatingMessage } =
  useAnimatedTripleDotMessage('Evaluating word')

async function sendWord() {
  const trimmedWordToSend = wordToSend.value.trim()
  if (!trimmedWordToSend.length || trimmedWordToSend.split(' ').length !== 1) {
    enterSingleWordError.value = true
    return
  }
  enterSingleWordError.value = false

  isProcessingWord.value = true
  await api.post('turns', {
    gameId: gameData.value.gameId,
    word: wordToSend.value
  })
  wordToSend.value = ''
}

// while word is being processed by ai => pause everything and include loading spinner
socket.on('processing-word', () => {
  isProcessingWord.value = true

  // pause turn timer
  clearInterval(turnTimeIntervalId)
  clearInterval(turnTimeBarIntervalId)
})

// word comes through as valid => update player, current word, reset turn timers
socket.on('valid-word', (word: string) => {
  isProcessingWord.value = false
  currentPlayerIndex.value = currentPlayerIndex.value === 0 ? 1 : 0
  currentWord.value = word

  turnTimeLeft.value = TURN_TIME_S
  turnTimeBarWidth.value = 100
  startTurnTimer()
  focusOnWordInput()
})

// game must end => go to results s
socket.on('end-game', async () => {
  await router.push({ path: `/game/${gameData.value.gameId}/results` })
})

onUnmounted(() => {
  socket.removeListener('processing-word')
  socket.removeListener('valid-word')
  socket.removeListener('end-game')
})
</script>

<template>
  <div class="flex h-screen w-screen items-center justify-center">
    <div class="mx-auto flex w-full max-w-3xl flex-col items-center gap-y-20 px-4">
      <h2 class="text-2xl">
        {{ currentPlayer.nickname }}'s turn {{ generatePlayerBracketText(currentPlayer.isYou) }}
      </h2>
      <template v-if="isProcessingWord">
        <span class="text-xl">{{ evaluatingMessage }}</span>
        <div role="status">
          <svg
            aria-hidden="true"
            class="inline h-8 w-8 animate-spin fill-gray-600 text-gray-200"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
              fill="currentColor"
            />
            <path
              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
              fill="currentFill"
            />
          </svg>
          <span class="sr-only">Loading...</span>
        </div>
      </template>
      <template v-else>
        <span class="text-6xl">{{ countdownTimeLeft > 0 ? countdownTimeLeft : currentWord }}</span>
      </template>
      <form @submit.prevent="sendWord" class="w-full max-w-md">
        <div class="mb-1 flex justify-between">
          <span
            class="text-base font-medium text-blue-700"
            :class="{ 'text-gray-400': isProcessingWord }"
            >Timer</span
          >
          <span
            class="text-sm font-medium text-blue-700"
            :class="{ 'text-gray-400': isProcessingWord }"
            >{{ `${turnTimeLeft}s` }}</span
          >
        </div>
        <div class="mb-2 h-2.5 w-full rounded-full bg-gray-200">
          <div
            class="h-2.5 rounded-full bg-blue-600"
            :style="{ width: `${turnTimeBarWidth}%` }"
            :class="{ 'bg-gray-800': isProcessingWord }"
          ></div>
        </div>
        <input
          v-model="wordToSend"
          type="text"
          placeholder="Type Word..."
          class="text-small block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-200"
          required
          :disabled="countdownTimeLeft > 0 || !currentPlayer.isYou || isProcessingWord"
          ref="word-input"
        />
        <p class="mt-2 text-sm text-red-600" v-if="enterSingleWordError">
          Please supply a single word
        </p>
      </form>
    </div>
  </div>
</template>
