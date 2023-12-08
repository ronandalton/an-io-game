import { Position } from './Position';

export class Camera {
    position: Position;
    viewAreaWidth: number;

    constructor(position: Position, viewAreaWidth: number) {
        this.position = position;
        this.viewAreaWidth = viewAreaWidth;
    }
}
