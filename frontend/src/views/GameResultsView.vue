<script setup lang="ts">
import { useRoute } from 'vue-router'
import { onMounted } from 'vue'
import { api } from '@/utils.js'

const route = useRoute()
const gameId = route.params.id
let results
onMounted(async () => {
  results = (await api.post(`/games/${gameId}/results`)).data
})
</script>
<template>
  <div class="flex h-screen w-screen items-center justify-center">
    <div class="mx-auto flex max-w-lg flex-col items-center gap-y-6 px-4 text-center">
      <h1 class="">Results</h1>
      <p>{{ results[0] }}</p>
    </div>
  </div>
</template>
