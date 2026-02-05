
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Grid, BuildingType } from '../types';

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

export const findPath = (start: {x: number, y: number}, end: {x: number, y: number}, grid: Grid): {x: number, y: number}[] | null => {
  const openList: Node[] = [];
  const closedList: boolean[][] = Array.from({ length: grid.length }, () => Array(grid[0].length).fill(false));

  const startNode: Node = {
    x: Math.round(start.x),
    y: Math.round(start.y),
    g: 0,
    h: Math.abs(start.x - end.x) + Math.abs(start.y - end.y),
    f: 0,
    parent: null
  };
  startNode.f = startNode.g + startNode.h;
  openList.push(startNode);

  while (openList.length > 0) {
    let currentIndex = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[currentIndex].f) {
        currentIndex = i;
      }
    }

    const currentNode = openList.splice(currentIndex, 1)[0];

    if (currentNode.x === Math.round(end.x) && currentNode.y === Math.round(end.y)) {
      const path: {x: number, y: number}[] = [];
      let temp: Node | null = currentNode;
      while (temp) {
        path.push({ x: temp.x, y: temp.y });
        temp = temp.parent;
      }
      return path.reverse();
    }

    closedList[currentNode.y][currentNode.x] = true;

    const neighbors = [
      { x: currentNode.x + 1, y: currentNode.y },
      { x: currentNode.x - 1, y: currentNode.y },
      { x: currentNode.x, y: currentNode.y + 1 },
      { x: currentNode.x, y: currentNode.y - 1 },
    ];

    for (const neighbor of neighbors) {
      if (
        neighbor.x < 0 || neighbor.x >= grid[0].length ||
        neighbor.y < 0 || neighbor.y >= grid.length ||
        closedList[neighbor.y][neighbor.x]
      ) {
        continue;
      }

      // Obstacle detection
      const tile = grid[neighbor.y][neighbor.x];
      const isWalkable = 
        tile.buildingType === BuildingType.None || 
        tile.buildingType === BuildingType.Road || 
        tile.buildingType === BuildingType.Highway || 
        tile.buildingType === BuildingType.Park;

      if (!isWalkable) continue;

      const gScore = currentNode.g + 1;
      let neighborInOpen = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);

      if (!neighborInOpen || gScore < neighborInOpen.g) {
        if (!neighborInOpen) {
          neighborInOpen = {
            x: neighbor.x,
            y: neighbor.y,
            g: gScore,
            h: Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y),
            f: 0,
            parent: currentNode
          };
          neighborInOpen.f = neighborInOpen.g + neighborInOpen.h;
          openList.push(neighborInOpen);
        } else {
          neighborInOpen.g = gScore;
          neighborInOpen.f = neighborInOpen.g + neighborInOpen.h;
          neighborInOpen.parent = currentNode;
        }
      }
    }
  }

  return null;
};
