import { Position } from './Position';

export type PlayerId = number;

export class Player {
    id: number;
    cellId: number;
    targetPosition: Position | null;

    constructor(id: number, cellId: number, targetPosition: Position | null) {
        this.id = id;
        this.cellId = cellId;
        this.targetPosition = targetPosition;
    }
}