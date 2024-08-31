<script setup lang="ts">
import {ref} from 'vue';
import {api} from '@/utils.js';

const test = ref('loading')
test.value = await api.get('/')

</script>

<template>
   <h1 class="font-bold text-3xl">{{ test }}</h1>
</template>
