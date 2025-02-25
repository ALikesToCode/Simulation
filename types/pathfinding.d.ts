declare namespace PF {
  interface FinderOptions {
    allowDiagonal?: boolean;
    dontCrossCorners?: boolean;
    heuristic?: Function;
    weight?: number;
    diagonalMovement?: number;
  }

  class Grid {
    constructor(width: number, height: number);
    width: number;
    height: number;
    setWalkableAt(x: number, y: number, walkable: boolean): void;
    isWalkableAt(x: number, y: number): boolean;
    getNodeAt(x: number, y: number): any;
    clone(): Grid;
  }

  class AStarFinder {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class BestFirstFinder {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class BreadthFirstFinder {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class DijkstraFinder {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class BiAStarFinder {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class BiBestFirstFinder {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class BiBreadthFirstFinder {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class BiDijkstraFinder {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class JumpPointFinder {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class IDAStarFinder {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class JPFMoveDiagonallyIfNoObstacles {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class JPFMoveDiagonallyIfAtMostOneObstacle {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class JPFAlwaysMoveDiagonally {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class JPFNeverMoveDiagonally {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  class TraceFinder {
    constructor(options?: FinderOptions);
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }
}

declare module 'pathfinding' {
  export = PF;
} 