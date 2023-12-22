import { CircularObject, CircularObjectId } from './CircularObject';
import { Position } from './Position';
import { MASS_TO_AREA_MULTIPLIER } from './constants';

export type CellId = CircularObjectId;

export class Cell implements CircularObject {
    id: CellId;
    position: Position;
    mass: number;

    constructor(id: CellId, position: Position, mass: number) {
        this.id = id;
        this.position = position;
        this.mass = mass;
    }

    get x(): number {
        return this.position.x;
    }

    get y(): number {
        return this.position.y;
    }

    get radius(): number {
        return Math.sqrt(this.mass * MASS_TO_AREA_MULTIPLIER / Math.PI);
    }

    clone(): this {
        return new Cell(this.id, this.position.clone(), this.mass) as this;
    }
}
