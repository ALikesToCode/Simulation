<template>
  <div class="app">
    <SimulationEnvironment />
  </div>
</template>

<script setup lang="ts">
import SimulationEnvironment from '~/components/SimulationEnvironment.vue'
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #1a1a1a;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

* {
  box-sizing: border-box;
}
</style> 