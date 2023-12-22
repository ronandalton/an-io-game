import { CellId } from './Cell';
import { Position } from './Position';

export type PlayerId = number;

export class Player {
    id: PlayerId;
    cellId: CellId;
    targetPosition: Position | null;

    constructor(id: PlayerId, cellId: CellId, targetPosition: Position | null) {
        this.id = id;
        this.cellId = cellId;
        this.targetPosition = targetPosition;
    }
}
