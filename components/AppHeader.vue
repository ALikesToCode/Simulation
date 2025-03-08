<template>
  <header class="app-header">
    <div class="container">
      <div class="logo">
        <NuxtLink to="/">
          <h1>Simulation</h1>
        </NuxtLink>
      </div>
      
      <nav class="main-nav">
        <div class="nav-links">
          <NuxtLink to="/" class="nav-link">Home</NuxtLink>
          <NuxtLink to="/simulation" class="nav-link">Simulation</NuxtLink>
          <NuxtLink to="/agents" class="nav-link">Agents</NuxtLink>
          <NuxtLink to="/settings" class="nav-link">Settings</NuxtLink>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
// No script needed for this component
</script>

<style scoped>
.app-header {
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.logo a {
  text-decoration: none;
  color: var(--color-text);
}

.main-nav {
  display: flex;
  align-items: center;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  text-decoration: none;
  color: var(--color-text);
  font-weight: 500;
  padding: 0.5rem 0;
  position: relative;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--color-primary);
}

.nav-link.nuxt-link-active {
  color: var(--color-primary);
}

.nav-link.nuxt-link-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--color-primary);
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-links {
    gap: 1rem;
  }
}
</style> 