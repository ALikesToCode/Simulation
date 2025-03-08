<template>
  <div class="app">
    <nav class="navigation">
      <div class="nav-logo">Multi-Agent Simulation</div>
      <button class="mobile-menu-button" @click="toggleMobileMenu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="nav-links" :class="{ 'mobile-open': mobileMenuOpen }">
        <NuxtLink to="/" class="nav-link" @click="closeMobileMenu">Home</NuxtLink>
        <NuxtLink to="/simulation" class="nav-link" @click="closeMobileMenu">Integrated Simulation</NuxtLink>
        <NuxtLink to="/agent-simulation" class="nav-link" @click="closeMobileMenu">Agent Simulation</NuxtLink>
        <NuxtLink to="/map3d" class="nav-link" @click="closeMobileMenu">3D Map</NuxtLink>
        <NuxtLink to="/map3d-advanced" class="nav-link" @click="closeMobileMenu">Advanced 3D</NuxtLink>
      </div>
    </nav>
    <main class="main-content">
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const mobileMenuOpen = ref(false);

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

const closeMobileMenu = () => {
  mobileMenuOpen.value = false;
};
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

.navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background-color: #2a2a2a;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.nav-logo {
  font-size: 18px;
  font-weight: bold;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-link.router-link-active {
  background-color: rgba(255, 255, 255, 0.2);
}

.main-content {
  flex: 1;
  overflow: hidden;
}

.mobile-menu-button {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 30px;
  height: 21px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 10;
}

.mobile-menu-button span {
  width: 100%;
  height: 3px;
  background-color: white;
  border-radius: 3px;
}

/* Media queries for responsive design */
@media (max-width: 768px) {
  .mobile-menu-button {
    display: flex;
  }
  
  .nav-links {
    position: fixed;
    top: 60px;
    right: -100%;
    width: 70%;
    height: calc(100vh - 60px);
    background-color: #2a2a2a;
    flex-direction: column;
    padding: 20px;
    transition: right 0.3s ease;
    z-index: 99;
  }
  
  .nav-links.mobile-open {
    right: 0;
  }
  
  .nav-link {
    padding: 15px 0;
    width: 100%;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}

* {
  box-sizing: border-box;
}
</style> 