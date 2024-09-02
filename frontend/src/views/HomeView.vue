<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/utils.js'

const test = ref('loading')
onMounted(async () => {
  test.value = (await api.get('/')).data
})
</script>

<template>
  <h1 class="font-bold text-3xl">{{ test }}</h1>
  <p>testtest</p>
</template>
