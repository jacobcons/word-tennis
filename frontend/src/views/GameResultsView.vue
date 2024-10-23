<script setup lang="ts">
import { useRoute } from 'vue-router'
import { onMounted } from 'vue'
import { api, generatePlayerText } from '@/utils.js'
import type { GameResults } from '@/types.js'

const route = useRoute()
const gameId = route.params.id
let results: GameResults
onMounted(async () => {
  results = (await api.post(`/games/${gameId}/results`)).data
})
</script>
<template>
  <div class="flex h-screen w-screen items-center justify-center">
    <div class="mx-auto flex max-w-lg flex-col items-center px-4 text-center">
      <h2>{{ generatePlayerText(results.winner) }} wins</h2>
    </div>
  </div>
</template>
