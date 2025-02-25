// Type definitions for Google Maps JavaScript API 3.0
// Project: https://developers.google.com/maps/documentation/javascript/
// Definitions by: Claude

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

declare namespace google.maps {
  // Map options interface
  interface MapOptions {
    center?: LatLng | LatLngLiteral;
    zoom?: number;
    mapTypeId?: string;
    heading?: number;
    tilt?: number;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    mapId?: string;
  }

  // Map class
  class Map {
    constructor(mapDiv: Element, opts?: MapOptions);
    setCenter(latLng: LatLng | LatLngLiteral): void;
    setZoom(zoom: number): void;
    setHeading(heading: number): void;
    getHeading(): number;
    setTilt(tilt: number): void;
    getTilt(): number;
    setMapTypeId(mapTypeId: string): void;
    getMapTypeId(): string;
    setOptions(options: MapOptions): void;
  }

  // MapTypeId constants
  class MapTypeId {
    static readonly ROADMAP: string;
    static readonly SATELLITE: string;
    static readonly HYBRID: string;
    static readonly TERRAIN: string;
  }

  // WebGLOverlayView for 3D buildings
  class WebGLOverlayView {
    constructor();
    setMap(map: Map | null): void;
    onAdd?(): void;
    onContextLost?(): void;
    onContextRestored?(options: WebGLStateOptions): void;
    onDraw?(options: WebGLDrawOptions): void;
    onRemove?(): void;
    requestRedraw(): void;
  }

  // WebGLStateOptions interface for WebGLOverlayView
  interface WebGLStateOptions {
    gl: WebGLRenderingContext;
  }

  // WebGLDrawOptions interface for WebGLOverlayView
  interface WebGLDrawOptions {
    gl: WebGLRenderingContext;
    transformer: CoordinateTransformer;
    matrix?: Float32Array;
    projection?: Float32Array;
  }

  // CoordinateTransformer interface for WebGLOverlayView
  interface CoordinateTransformer {
    fromLatLngAltitude(latLng: LatLng | LatLngLiteral, altitude?: number): { x: number; y: number; z: number };
    getCameraParams(): {
      center: { lat: number; lng: number };
      zoom: number;
      heading: number;
      tilt: number;
    };
  }

  // LatLng class
  class LatLng {
    constructor(lat: number, lng: number, noWrap?: boolean);
    lat(): number;
    lng(): number;
    toString(): string;
    toJSON(): LatLngLiteral;
    equals(other: LatLng): boolean;
  }

  // LatLngLiteral interface
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  // Event namespace
  namespace event {
    function addListener(instance: object, eventName: string, handler: Function): MapsEventListener;
    function addListenerOnce(instance: object, eventName: string, handler: Function): MapsEventListener;
    function clearInstanceListeners(instance: object): void;
    function clearListeners(instance: object, eventName: string): void;
    function removeListener(listener: MapsEventListener): void;
    function trigger(instance: object, eventName: string, ...args: any[]): void;
  }

  // MapsEventListener interface
  interface MapsEventListener {
    remove(): void;
  }

  // Places namespace
  namespace places {
    class PlacesService {
      constructor(attrContainer: HTMLDivElement | Map);
      nearbySearch(request: PlaceSearchRequest, callback: (results: PlaceResult[], status: PlacesServiceStatus) => void): void;
      getDetails(request: PlaceDetailsRequest, callback: (result: PlaceResult, status: PlacesServiceStatus) => void): void;
    }

    interface PlaceSearchRequest {
      location: LatLng;
      radius: number;
      type: string[];
    }

    interface PlaceDetailsRequest {
      placeId: string;
      key?: string;
      fields?: string[];
    }

    interface PlaceResult {
      place_id: string;
      name?: string;
      geometry?: {
        location: LatLng;
      };
      types?: string[];
      rating?: number;
      building_levels?: number;
    }

    enum PlacesServiceStatus {
      OK = 'OK',
      ZERO_RESULTS = 'ZERO_RESULTS',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      INVALID_REQUEST = 'INVALID_REQUEST',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR',
      NOT_FOUND = 'NOT_FOUND'
    }
  }

  // Visualization namespace
  namespace visualization {
    class HeatmapLayer {
      constructor(opts?: HeatmapLayerOptions);
      setMap(map: Map | null): void;
      setData(data: any[]): void;
      getData(): any[];
    }

    interface HeatmapLayerOptions {
      map?: Map;
      data?: any[];
      dissipating?: boolean;
      radius?: number;
      opacity?: number;
    }
  }

  // Elevation API
  class ElevationService {
    constructor();
    getElevationForLocations(
      request: LocationElevationRequest,
      callback: (results: ElevationResult[] | null, status: ElevationStatus) => void
    ): void;
    getElevationAlongPath(
      request: PathElevationRequest,
      callback: (results: ElevationResult[] | null, status: ElevationStatus) => void
    ): void;
  }

  interface LocationElevationRequest {
    locations: LatLng[] | LatLngLiteral[];
  }

  interface PathElevationRequest {
    path: LatLng[] | LatLngLiteral[];
    samples: number;
  }

  interface ElevationResult {
    elevation: number;
    location: LatLng;
    resolution: number;
  }

  enum ElevationStatus {
    OK = 'OK',
    INVALID_REQUEST = 'INVALID_REQUEST',
    OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
    REQUEST_DENIED = 'REQUEST_DENIED',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    DATA_NOT_AVAILABLE = 'DATA_NOT_AVAILABLE'
  }
}

export {}; 