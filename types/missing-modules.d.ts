// Type declarations for missing modules
// Definitions by: Claude

// GeoJSON
declare module 'geojson' {
  export interface Position {
    [index: number]: number;
  }

  export interface Geometry {
    type: string;
    coordinates: any[];
  }

  export interface Feature {
    type: 'Feature';
    geometry: Geometry;
    properties?: any;
    id?: string;
  }

  export interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature[];
  }
}

// H3 module
declare module 'h3' {
  export function createError(options: { statusCode?: number; statusMessage?: string; message?: string }): Error;
}

// HTTP-errors module
declare module 'http-errors' {
  export function createError(options: { statusCode?: number; statusMessage?: string; message?: string }): Error;
}

// Vite environment variables
interface ImportMeta {
  env: Record<string, string>;
}

// Anthropic SDK
declare module '@anthropic-ai/sdk' {
  export default class Anthropic {
    constructor(options: { apiKey: string | undefined });
    
    messages: {
      create(params: {
        model: string;
        max_tokens: number;
        messages: Array<{ role: string; content: string }>;
      }): Promise<any>;
    };
  }
}

// Pathfinding
declare namespace PF {
  interface FinderOptions {
    allowDiagonal?: boolean;
    dontCrossCorners?: boolean;
    heuristic?: Function;
    weight?: number;
  }

  class AStarFinder {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: any): number[][];
  }
} 