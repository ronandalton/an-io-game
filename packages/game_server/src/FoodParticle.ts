import { CircularObject, CircularObjectId } from './CircularObject';
import { Position } from './Position';
import { FOOD_RADIUS } from './constants';

export type FoodParticleId = CircularObjectId;

export class FoodParticle implements CircularObject {
    id: FoodParticleId;
    position: Position;
    hue: number; // 0-255 value representing color

    constructor(id: FoodParticleId, position: Position, hue: number) {
        this.id = id;
        this.position = position;
        this.hue = hue;
    }

    get x(): number {
        return this.position.x;
    }

    get y(): number {
        return this.position.y;
    }

    get radius(): number {
        return FOOD_RADIUS;
    }

    clone(): this {
        return new FoodParticle(this.id, this.position.clone(), this.hue) as this;
    }
}
