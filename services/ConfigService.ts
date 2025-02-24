export class ConfigService {
  static getEnvVar(key: string, defaultValue: string = ''): string {
    return import.meta.env[`VITE_${key}`] || defaultValue
  }

  static getEnvNumber(key: string, defaultValue: number): number {
    const value = import.meta.env[`VITE_${key}`]
    return value ? Number(value) : defaultValue
  }

  static getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = import.meta.env[`VITE_${key}`]
    return value ? value.toLowerCase() === 'true' : defaultValue
  }

  static getEnvArray(key: string, defaultValue: any[]): any[] {
    const value = import.meta.env[`VITE_${key}`]
    return value ? JSON.parse(value) : defaultValue
  }

  // API Keys
  static get openAIKey(): string {
    return this.getEnvVar('OPENAI_API_KEY')
  }

  static get googleKey(): string {
    return this.getEnvVar('GOOGLE_API_KEY')
  }

  static get anthropicKey(): string {
    return this.getEnvVar('ANTHROPIC_API_KEY')
  }

  static get pineconeKey(): string {
    return this.getEnvVar('PINECONE_API_KEY')
  }

  static get pineconeEnvironment(): string {
    return this.getEnvVar('PINECONE_ENVIRONMENT')
  }

  // Simulation Settings
  static get cityCenter(): [number, number] {
    return [
      this.getEnvNumber('SIMULATION_CITY_CENTER_LAT', 40.7580),
      this.getEnvNumber('SIMULATION_CITY_CENTER_LNG', -73.9855)
    ]
  }

  static get simulationRadius(): number {
    return this.getEnvNumber('SIMULATION_RADIUS', 1000)
  }

  static get gridSize(): number {
    return this.getEnvNumber('SIMULATION_GRID_SIZE', 5)
  }

  static get blueAgentsCount(): number {
    return this.getEnvNumber('BLUE_AGENTS_COUNT', 5)
  }

  static get redAgentsCount(): number {
    return this.getEnvNumber('RED_AGENTS_COUNT', 3)
  }

  // Visual Settings
  static get enableShadows(): boolean {
    return this.getEnvBoolean('ENABLE_SHADOWS', true)
  }

  static get enablePathVisualization(): boolean {
    return this.getEnvBoolean('ENABLE_PATH_VISUALIZATION', true)
  }

  static get enableInteractionIndicators(): boolean {
    return this.getEnvBoolean('ENABLE_INTERACTION_INDICATORS', true)
  }

  // Performance Settings
  static get maxVisibleBuildings(): number {
    return this.getEnvNumber('MAX_VISIBLE_BUILDINGS', 1000)
  }

  static get lodDistances(): number[] {
    return this.getEnvArray('LOD_DISTANCES', [100, 500, 1000])
  }

  static get enableFrustumCulling(): boolean {
    return this.getEnvBoolean('ENABLE_FRUSTUM_CULLING', true)
  }

  // Map Settings
  static get mapStyle(): 'dark' | 'light' | 'satellite' {
    return this.getEnvVar('MAP_STYLE', 'dark') as 'dark' | 'light' | 'satellite'
  }

  static get enableBuildingTextures(): boolean {
    return this.getEnvBoolean('ENABLE_BUILDING_TEXTURES', true)
  }

  static get enableRoadLabels(): boolean {
    return this.getEnvBoolean('ENABLE_ROAD_LABELS', true)
  }

  // API Configuration
  static get apiUrl(): string {
    return this.getEnvVar('API_URL', 'http://localhost:3001')
  }
} 