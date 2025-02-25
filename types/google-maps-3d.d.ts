// Type definitions for Google Maps JavaScript API 3D Maps
// Based on documentation from https://developers.google.com/maps/documentation/javascript/reference/3d-map

declare namespace google.maps {
  // Import library function
  function importLibrary(libraryName: string): Promise<any>;
  
  // Map3DElement interface
  interface Map3DElementOptions {
    center?: {
      lat: number;
      lng: number;
      altitude?: number;
    };
    range?: number;
    tilt?: number;
    heading?: number;
    mapId?: string;
    mode?: MapMode;
  }
  
  // MapMode enum
  enum MapMode {
    ROADMAP = 'roadmap',
    SATELLITE = 'satellite',
    HYBRID = 'hybrid',
    TERRAIN = 'terrain'
  }
  
  interface CameraAnimationOptions {
    center?: {
      lat: number;
      lng: number;
      altitude?: number;
    };
    range?: number;
    tilt?: number;
    heading?: number;
    duration?: number;
  }
  
  interface FlyAroundOptions {
    duration?: number;
    radius?: number;
    cycles?: number;
  }
  
  interface Map3DElement extends HTMLElement {
    // Constructor
    new(options?: Map3DElementOptions): Map3DElement;
    
    // Properties
    center: { lat: number; lng: number; altitude?: number };
    heading: number;
    tilt: number;
    range: number;
    mapId: string;
    
    // Methods
    getCenter(): { lat: number; lng: number; altitude?: number };
    setCenter(center: { lat: number; lng: number; altitude?: number }): void;
    getHeading(): number;
    setHeading(heading: number): void;
    getTilt(): number;
    setTilt(tilt: number): void;
    getRange(): number;
    setRange(range: number): void;
    getMapId(): string;
    setMapId(mapId: string): void;
    
    // Camera methods
    flyCameraTo(options: CameraAnimationOptions): void;
    flyCameraAround(options: FlyAroundOptions): void;
    setCameraMode(mode: 'orbit' | 'free'): void;
    
    // Feature visibility
    setFeatureVisibility(featureType: string, visible: boolean): void;
    
    // Event handling
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    
    // DOM methods
    appendChild(child: Node): Node;
    removeChild(child: Node): Node;
  }
  
  // Model3DElement interface
  interface Model3DElementOptions {
    src: string;
    position: {
      lat: number;
      lng: number;
      altitude?: number;
    };
    orientation?: {
      heading?: number;
      tilt?: number;
      roll?: number;
    };
    scale?: number | {
      x: number;
      y: number;
      z: number;
    };
  }
  
  interface Model3DElement extends HTMLElement {
    // Constructor
    new(options: Model3DElementOptions): Model3DElement;
    
    // Properties
    src: string;
    position: { lat: number; lng: number; altitude?: number };
    orientation: { heading: number; tilt: number; roll: number };
    scale: number | { x: number; y: number; z: number };
    
    // Methods
    getPosition(): { lat: number; lng: number; altitude?: number };
    setPosition(position: { lat: number; lng: number; altitude?: number }): void;
    getOrientation(): { heading: number; tilt: number; roll: number };
    setOrientation(orientation: { heading?: number; tilt?: number; roll?: number }): void;
    getScale(): number | { x: number; y: number; z: number };
    setScale(scale: number | { x: number; y: number; z: number }): void;
    
    // Event handling
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    
    // DOM methods
    remove(): void;
  }
  
  // Declare the maps3d library structure
  interface Maps3DLibrary {
    Map3DElement: {
      new(options?: Map3DElementOptions): Map3DElement;
    };
    Model3DElement: {
      new(options: Model3DElementOptions): Model3DElement;
    };
    MapMode: typeof MapMode;
  }
}

// Extend Window interface
declare global {
  interface Window {
    initMap3DAdvanced?: () => void;
    map3DElement?: any;
    Model3DElement?: any;
  }
}

export {}; 