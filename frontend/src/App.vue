<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const route = useRoute()
const isAuthRoute = computed(() => route.meta.requiresAuth)
</script>

<template>
  <MainLayout v-if="isAuthRoute" />
  <RouterView v-else />
</template>
