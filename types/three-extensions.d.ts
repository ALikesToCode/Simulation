// Type definitions for THREE.js extensions
// Project: https://threejs.org/
// Definitions by: Claude

declare module 'three/examples/jsm/controls/OrbitControls' {
  import { Camera, EventDispatcher, Vector3 } from 'three';

  export class OrbitControls extends EventDispatcher {
    constructor(camera: Camera, domElement?: HTMLElement);
    
    enabled: boolean;
    target: Vector3;
    
    minDistance: number;
    maxDistance: number;
    
    minZoom: number;
    maxZoom: number;
    
    minPolarAngle: number;
    maxPolarAngle: number;
    
    minAzimuthAngle: number;
    maxAzimuthAngle: number;
    
    enableDamping: boolean;
    dampingFactor: number;
    
    enableZoom: boolean;
    zoomSpeed: number;
    
    enableRotate: boolean;
    rotateSpeed: number;
    
    enablePan: boolean;
    panSpeed: number;
    screenSpacePanning: boolean;
    keyPanSpeed: number;
    
    autoRotate: boolean;
    autoRotateSpeed: number;
    
    enableKeys: boolean;
    
    update(): boolean;
    dispose(): void;
    getAzimuthalAngle(): number;
    getPolarAngle(): number;
    saveState(): void;
    reset(): void;
  }
} 