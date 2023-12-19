import { Client } from './Client';
import { Game } from './Game';
import { Position } from './Position';
import { PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT, CAMERA_START_VIEW_AREA_WIDTH } from './constants';

export class Camera {
    position: Position;
    viewAreaWidth: number;

    constructor() {
        this.position = new Position(PLAY_AREA_WIDTH / 2, PLAY_AREA_HEIGHT / 2);
        this.viewAreaWidth = CAMERA_START_VIEW_AREA_WIDTH;
    }

    updateView(client: Client, game: Game): void {
		if (client.playerId === null) {
            return;
        }

        const player = game.players.get(client.playerId);

        if (player === undefined) {
            throw new Error("Player not found");
        }

        const cell = game.cells.get(player.cellId);

        if (cell === null) {
            throw new Error("Cell not found");
        }

        this.position = cell.position.clone();
    }
}
