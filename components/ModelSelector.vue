<template>
  <div class="model-selector">
    <div class="model-selector-header">
      <h3>AI Model Selection</h3>
      <div class="provider-tabs">
        <button 
          v-for="p in providers" 
          :key="p.id" 
          :class="{ active: selectedProvider === p.id }"
          @click="selectProvider(p.id)"
        >
          {{ p.name }}
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>Loading models...</span>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchModels">Try Again</button>
    </div>
    
    <div v-else class="models-list">
      <div 
        v-for="model in filteredModels" 
        :key="model.id" 
        class="model-card"
        :class="{ selected: selectedModel === model.id }"
        @click="selectModel(model)"
      >
        <div class="model-info">
          <h4>{{ model.name }}</h4>
          <p class="description">{{ model.description }}</p>
          <div class="capabilities">
            <span v-for="capability in model.capabilities" :key="capability" class="capability">
              {{ capability }}
            </span>
          </div>
        </div>
        <div class="model-meta">
          <span class="context-window">{{ formatContextWindow(model.contextWindow) }}</span>
          <span v-if="model.isMultimodal" class="multimodal-badge">Multimodal</span>
          <span v-if="model.releaseDate" class="release-date">{{ formatReleaseDate(model.releaseDate) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useModelStore } from '../stores/model'

interface Provider {
  id: 'google' | 'openai' | 'anthropic' | 'all';
  name: string;
}

const providers: Provider[] = [
  { id: 'all', name: 'All Models' },
  { id: 'google', name: 'Google' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' }
]

const modelStore = useModelStore()
const loading = ref(true)
const error = ref('')
const selectedProvider = ref<'google' | 'openai' | 'anthropic' | 'all'>('all')
const selectedModel = computed(() => modelStore.selectedModel)

const filteredModels = computed(() => {
  // First sort models by release date (newest first)
  const sortedModels = [...modelStore.models].sort((a, b) => {
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
  });
  
  // Then filter by provider if needed
  if (selectedProvider.value === 'all') {
    return sortedModels;
  }
  return sortedModels.filter(model => model.provider === selectedProvider.value);
})

function selectProvider(provider: 'google' | 'openai' | 'anthropic' | 'all') {
  selectedProvider.value = provider
}

function selectModel(model: any) {
  modelStore.setSelectedModel(model.id)
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) {
    return `${tokens / 1000000}M tokens`
  } else if (tokens >= 1000) {
    return `${tokens / 1000}K tokens`
  }
  return `${tokens} tokens`
}

function formatReleaseDate(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

async function fetchModels() {
  loading.value = true
  error.value = ''
  
  try {
    await modelStore.fetchModels()
  } catch (err) {
    error.value = 'Failed to load models. Please try again.'
    console.error('Error fetching models:', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchModels()
})
</script>

<style scoped>
.model-selector {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  background-color: var(--color-background);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.model-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.provider-tabs {
  display: flex;
  gap: 0.5rem;
}

.provider-tabs button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-tabs button.active {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.models-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.model-card {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.model-card.selected {
  border-color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb), 0.05);
}

.model-info h4 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.description {
  font-size: 0.9rem;
  color: var(--color-text-light);
  margin-bottom: 0.75rem;
}

.capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.capability {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  background-color: var(--color-background-soft);
  border-radius: 4px;
}

.model-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.context-window {
  color: var(--color-text-light);
}

.multimodal-badge {
  background-color: var(--color-primary);
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.release-date {
  font-size: 0.8rem;
  color: var(--color-text-light);
  background-color: var(--color-background-soft);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  margin-left: 0.5rem;
}

.loading, .error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(var(--color-primary-rgb), 0.3);
  border-radius: 50%;
  border-top-color: var(--color-primary);
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style> 