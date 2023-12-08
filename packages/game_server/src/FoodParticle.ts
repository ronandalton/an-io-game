import { Position } from './Position';
import { FOOD_RADIUS } from './constants';

export class FoodParticle {
    id: number;
    position: Position;
    hue: number; // 0-255 value representing color

    constructor(id: number, position: Position, hue: number) {
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

    clone(): FoodParticle {
        return new FoodParticle(this.id, this.position.clone(), this.hue);
    }
}
