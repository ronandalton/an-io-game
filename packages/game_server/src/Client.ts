import { Camera } from './Camera';
import { Game } from './Game';
import { PlayerId } from './Player';

export type ClientId = number;

export class Client {
    id: ClientId;
    camera: Camera;
    playerId: PlayerId | null;

    constructor(id: ClientId) {
        this.id = id;
        this.camera = new Camera();
        this.playerId = null;
    }

    update(game: Game): void {
        this.camera.updateView(this, game);
    }
}
