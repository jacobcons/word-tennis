<script setup lang="ts">
import { useRoute } from 'vue-router'
import { onMounted, ref } from 'vue'
import { api, generatePlayerBracketText, generatePlayerText } from '@/utils.js'
import { EndReason, type GameResults } from '@/types.js'

const route = useRoute()
const gameId = route.params.id
const results = ref<GameResults>()

const TEXT_COLOUR_FIRST_PLAYER = 'text-blue-400'
const TEXT_COLOUR_SECOND_PLAYER = 'text-red-400'
let colourOfLastWord: string

onMounted(async () => {
  const response = await api.get(`/games/${gameId}/results`)
  results.value = response.data as GameResults
  colourOfLastWord =
    results.value.turns.length % 2 === 0 ? TEXT_COLOUR_SECOND_PLAYER : TEXT_COLOUR_FIRST_PLAYER
})

function convertEndReasonToText(endReason: EndReason) {
  switch (endReason) {
    case EndReason.InvalidWord:
      return 'not a real word'
    case EndReason.UnrelatedWord:
      return 'not related to previous word'
    case EndReason.SameSimilarWord:
      return 'same/too similar to a previous word'
  }
}
</script>
<template>
  <div class="mx-auto my-24 flex flex-col items-center px-4 text-center" v-if="results">
    <h1 class="mb-8 text-xl xs:text-3xl">
      {{ results.winner.nickname }} wins {{ generatePlayerBracketText(results.winner.isYou) }}
    </h1>

    <div class="mb-8 flex flex-col items-center gap-4">
      <div
        v-for="(player, i) in results.players"
        :key="player.id"
        class="flex items-baseline justify-center gap-x-4"
      >
        <h2 class="text-base font-normal xs:text-xl" v-html="generatePlayerText(player)"></h2>
        <div class="h-4 w-4" :class="i % 2 === 0 ? 'bg-blue-400' : 'bg-red-400'"></div>
      </div>
    </div>

    <div class="mb-8 flex flex-col gap-4">
      <router-link
        to="/"
        type="button"
        class="rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white no-underline hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      >
        Home
      </router-link>
      <router-link
        to="/search"
        type="button"
        class="rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white no-underline hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      >
        Play again
      </router-link>
    </div>

    <div class="mb-8 flex flex-col items-center gap-y-3">
      <template v-for="(turn, i) in results.turns.slice(0, -1)" :key="i">
        <span
          class="text-2xl"
          :class="[i % 2 === 0 ? TEXT_COLOUR_FIRST_PLAYER : TEXT_COLOUR_SECOND_PLAYER]"
        >
          {{ turn.word }}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="size-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
          />
        </svg>
      </template>
      <span
        class="text-2xl"
        :class="[
          results.turns.length % 2 === 0 ? TEXT_COLOUR_SECOND_PLAYER : TEXT_COLOUR_FIRST_PLAYER
        ]"
        v-if="results.turns.length"
      >
        {{ results.turns[results.turns.length - 1].word }}
        <template v-if="results.endReason !== EndReason.TookTooLong">
          ({{ convertEndReasonToText(results.endReason) }})
        </template>
      </span>
      <template v-if="results.endReason === EndReason.TookTooLong">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="size-6"
          v-if="results.turns.length"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
          />
        </svg>
        <span
          class="text-2xl"
          :class="[
            results.turns.length % 2 === 0 ? TEXT_COLOUR_FIRST_PLAYER : TEXT_COLOUR_SECOND_PLAYER
          ]"
          >took too long</span
        >
      </template>
    </div>

    <div class="mb-8 flex flex-col gap-4">
      <router-link
        to="/"
        type="button"
        class="rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white no-underline hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      >
        Home
      </router-link>
      <router-link
        to="/search"
        type="button"
        class="rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white no-underline hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      >
        Play again
      </router-link>
    </div>
  </div>
</template>
