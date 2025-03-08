<template>
  <div class="settings-page">
    <h1>Settings</h1>
    
    <div class="settings-section">
      <h2>AI Models</h2>
      <p>Select your preferred AI model for generating responses.</p>
      <ModelSelector />
    </div>
    
    <div class="settings-section">
      <h2>API Keys</h2>
      <p>Configure your API keys for different AI providers.</p>
      <div class="security-warning">
        <strong>⚠️ Security Warning:</strong> Storing API keys in the browser is not secure for production use. 
        In a real application, API keys should be stored securely on a server and never exposed to the client.
        This implementation is for demonstration purposes only.
      </div>
      
      <div class="api-key-form">
        <div class="form-group">
          <label for="google-api-key">Google API Key</label>
          <input 
            type="password" 
            id="google-api-key" 
            v-model="googleApiKey" 
            placeholder="Enter your Google API key"
          />
        </div>
        
        <div class="form-group">
          <label for="openai-api-key">OpenAI API Key</label>
          <input 
            type="password" 
            id="openai-api-key" 
            v-model="openaiApiKey" 
            placeholder="Enter your OpenAI API key"
          />
        </div>
        
        <div class="form-group">
          <label for="anthropic-api-key">Anthropic API Key</label>
          <input 
            type="password" 
            id="anthropic-api-key" 
            v-model="anthropicApiKey" 
            placeholder="Enter your Anthropic API key"
          />
        </div>
        
        <button @click="saveApiKeys" class="save-button">Save API Keys</button>
      </div>
    </div>
    
    <div class="settings-section">
      <h2>Application Settings</h2>
      
      <div class="form-group">
        <label for="theme">Theme</label>
        <select id="theme" v-model="theme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System Default</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>
          <input type="checkbox" v-model="enableNotifications" />
          Enable Notifications
        </label>
      </div>
      
      <button @click="saveSettings" class="save-button">Save Settings</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ModelSelector from '../components/ModelSelector.vue'

// API Keys
const googleApiKey = ref('')
const openaiApiKey = ref('')
const anthropicApiKey = ref('')

// App Settings
const theme = ref('system')
const enableNotifications = ref(true)

// Load settings from localStorage
onMounted(() => {
  // Load API keys (in a real app, these would be stored securely)
  googleApiKey.value = localStorage.getItem('googleApiKey') || ''
  openaiApiKey.value = localStorage.getItem('openaiApiKey') || ''
  anthropicApiKey.value = localStorage.getItem('anthropicApiKey') || ''
  
  // Load app settings
  theme.value = localStorage.getItem('theme') || 'system'
  enableNotifications.value = localStorage.getItem('enableNotifications') !== 'false'
})

// Save API keys
function saveApiKeys() {
  localStorage.setItem('googleApiKey', googleApiKey.value)
  localStorage.setItem('openaiApiKey', openaiApiKey.value)
  localStorage.setItem('anthropicApiKey', anthropicApiKey.value)
  
  // In a real app, you would send these to a secure backend
  alert('API keys saved!')
}

// Save app settings
function saveSettings() {
  localStorage.setItem('theme', theme.value)
  localStorage.setItem('enableNotifications', enableNotifications.value.toString())
  
  // Apply theme
  if (theme.value === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (theme.value === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    // System default
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
  
  alert('Settings saved!')
}
</script>

<style scoped>
.settings-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  margin-bottom: 2rem;
  font-size: 2rem;
}

.settings-section {
  margin-bottom: 3rem;
  padding: 1.5rem;
  background-color: var(--color-background-soft);
  border-radius: 8px;
}

h2 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

input[type="password"],
input[type="text"],
select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background);
}

.save-button {
  padding: 0.75rem 1.5rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.save-button:hover {
  background-color: var(--color-primary-dark);
}

.api-key-form {
  margin-top: 1.5rem;
}

.security-warning {
  background-color: #fff3cd;
  color: #856404;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 4px;
  border-left: 4px solid #ffeeba;
}
</style> 