import { Camera } from './Camera';
import { Game } from './Game';
import { PlayerId } from './Player';

export type ClientId = number;

export class Client {
    clientId: ClientId;
    camera: Camera;
    playerId: PlayerId | null;

    constructor(clientId: ClientId) {
        this.clientId = clientId;
        this.camera = new Camera();
        this.playerId = null;
    }

    update(game: Game): void {
        this.camera.updateView(this, game);
    }
}
