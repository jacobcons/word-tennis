<script setup lang="ts">
import { useRoute } from 'vue-router'
import { onMounted, ref } from 'vue'
import { api, generatePlayerBracketText, generatePlayerText } from '@/utils.js'
import { EndReason, type GameResults } from '@/types.js'

const route = useRoute()
const gameId = route.params.id
const results = ref<GameResults>()
let loserId: string

onMounted(async () => {
  const response = await api.get(`/games/${gameId}/results`)
  results.value = response.data as GameResults
  // get id of player after last
  loserId =
    results.value.winner.id === results.value.players[0].id
      ? results.value.players[1].id
      : results.value.players[0].id
})

function convertEndReasonToText(endReason: EndReason) {
  switch (endReason) {
    case EndReason.InvalidWord:
      return 'not a real word'
    case EndReason.UnrelatedWord:
      return 'not related to previous word'
    case EndReason.SameSimilarWord:
      return 'same as a previous word'
  }
}

function getPlayerColour(playerId: string) {
  const res = results.value as GameResults
  return playerId === res.players[0].id ? 'blue-400' : 'red-400'
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
        <div class="h-4 w-4" :class="`bg-${getPlayerColour(player.id)}`"></div>
      </div>
    </div>

    <div class="mb-8 flex flex-col gap-4">
      <router-link
        to="/"
        type="button"
        class="rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white no-underline hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        Home
      </router-link>
      <router-link
        to="/search"
        type="button"
        class="rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white no-underline hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        Play again
      </router-link>
    </div>

    <div class="mb-8 flex flex-col items-center gap-y-3">
      <template v-if="results.endReason === EndReason.TookTooLong">
        <span class="text-2xl" :class="`text-${getPlayerColour(loserId)}`">took too long</span>
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
            d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
          />
        </svg>
      </template>
      <template v-for="(turn, i) in [...results.turns].reverse()" :key="i">
        <span class="text-2xl" :class="`text-${getPlayerColour(turn.playerId)}`">
          {{ turn.word }}
          <template v-if="results.endReason !== EndReason.TookTooLong && i === 0">
            ({{ convertEndReasonToText(results.endReason) }})
          </template>
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
            d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
          />
        </svg>
      </template>
    </div>

    <div class="mb-8 flex flex-col gap-4">
      <router-link
        to="/"
        type="button"
        class="rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white no-underline hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        Home
      </router-link>
      <router-link
        to="/search"
        type="button"
        class="rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white no-underline hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        Play again
      </router-link>
    </div>
  </div>
</template>
