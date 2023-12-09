import { CircularObject } from './CircularObject';
import { Position } from './Position';
import { MASS_TO_AREA_MULTIPLIER } from './constants';

export class Cell implements CircularObject {
    id: number;
    position: Position;
    mass: number;

    constructor(id: number, position: Position, mass: number) {
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
