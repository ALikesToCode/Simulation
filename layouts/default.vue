<template>
  <div class="app-layout">
    <AppHeader />
    <main class="main-content">
      <slot />
    </main>
    <footer class="app-footer">
      <div class="container">
        <p>&copy; {{ new Date().getFullYear() }} Simulation Project</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
}

.app-footer {
  background-color: var(--color-background-soft);
  padding: 1.5rem 0;
  border-top: 1px solid var(--color-border);
  margin-top: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.app-footer p {
  text-align: center;
  color: var(--color-text-light);
  margin: 0;
}
</style> 