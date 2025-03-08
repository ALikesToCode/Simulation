import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AIModel } from '../services/ModelService'

export const useModelStore = defineStore('model', () => {
  const models = ref<AIModel[]>([])
  const selectedModel = ref<string>('gemini-2.0-pro')
  const isLoading = ref(false)
  
  async function fetchModels() {
    isLoading.value = true
    try {
      const response = await fetch('/api/models')
      const data = await response.json()
      
      if (data?.models) {
        // Sort models by release date (newest first)
        models.value = data.models.sort((a: AIModel, b: AIModel) => {
          if (!a.releaseDate) return 1;
          if (!b.releaseDate) return -1;
          return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        });
        
        // If the selected model is not in the list, select the first one
        if (!models.value.some(model => model.id === selectedModel.value) && models.value.length > 0) {
          selectedModel.value = models.value[0].id
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      // Set empty models array instead of re-throwing
      models.value = []
    } finally {
      isLoading.value = false
    }
  }
  
  function setSelectedModel(modelId: string) {
    selectedModel.value = modelId
    // Save to localStorage for persistence
    localStorage.setItem('selectedModel', modelId)
  }
  
  // Initialize from localStorage if available
  function initFromStorage() {
    const storedModel = localStorage.getItem('selectedModel')
    if (storedModel) {
      selectedModel.value = storedModel
    }
  }
  
  // Call init on store creation
  initFromStorage()
  
  return {
    models,
    selectedModel,
    isLoading,
    fetchModels,
    setSelectedModel
  }
}) 