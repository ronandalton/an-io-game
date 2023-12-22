import { Cell } from "./Cell";
import { CircularObjectMap } from "./CircularObjectMap";
import { FoodParticle } from "./FoodParticle";
import { Player, PlayerId } from "./Player";
import { Position } from "./Position";
import { CELL_MOVEMENT_SPEED, MAX_PLAYERS, PLAYER_STARTING_MASS, PLAY_AREA_HEIGHT, PLAY_AREA_WIDTH } from "./constants";
import { generateGameObjectId, getRandomInt, getRandomPosition } from "./utils";

export class Game {
	players: Map<PlayerId, Player>;
	cells: CircularObjectMap<Cell>;
	foodParticles: CircularObjectMap<FoodParticle>;

	private availablePlayerIds: PlayerId[];

	constructor() {
		this.players = new Map();
		this.cells = new CircularObjectMap<Cell>(0, 0, PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT);
		this.foodParticles = new CircularObjectMap<FoodParticle>(0, 0, PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT);

		this.availablePlayerIds = [];
		for (let i = MAX_PLAYERS - 1; i >= 0; i--) {
			this.availablePlayerIds.push(i);
		}
	}

	setup(): void {
		// TODO
		this.spawnFood();
	}

	spawnPlayer(): Player | null {
		const playerId = this.getUnusedPlayerId();

		if (playerId === null) {
			return null; // can't spawn player because server is full
		}

		const cellId = generateGameObjectId();
		const position = getRandomPosition();
		const cell = new Cell(cellId, position, PLAYER_STARTING_MASS);
		this.cells.add(cell);

		const player = new Player(playerId, cellId, null);
		this.players.set(playerId, player);

		return player;
	}

	update(): void {
		for (const player of this.players.values()) {
			const playerCell = this.cells.get(player.cellId);

			if (playerCell === null) {
				throw new Error("Cell not found");
			}

			if (player.targetPosition !== null) {
				Game.moveCellTowardsTargetPosition(playerCell, player.targetPosition, CELL_MOVEMENT_SPEED);
			}

			// TODO: better covering algorithm
			const foodParticlesCovered = this.foodParticles.findSmallerObjectsIntersecting(playerCell);
			for (const foodParticle of foodParticlesCovered) {
				this.foodParticles.remove(foodParticle.id);
				playerCell.mass += 10;
			}

			this.cells.add(playerCell);
		}
	}

	private spawnFood(): void {
		for (let i = 0; i < 4000; i++) {
			const id = generateGameObjectId();
			const position = getRandomPosition();
			const hue = getRandomInt(0, 256);
			const foodParticle = new FoodParticle(id, position, hue);
			this.foodParticles.add(foodParticle);
		}
	}

	private static moveCellTowardsTargetPosition(cell: Cell, targetPosition: Position, moveDistance: number): void {
		const dx = targetPosition.x - cell.position.x;
		const dy = targetPosition.y - cell.position.y;

		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist <= moveDistance) {
			cell.position.x = targetPosition.x;
			cell.position.y = targetPosition.y;
			return;
		}

		const dxNorm = dx / dist;
		const dyNorm = dy / dist;

		cell.position.x += dxNorm * moveDistance;
		cell.position.y += dyNorm * moveDistance;
	}

	private getUnusedPlayerId(): PlayerId | null {
		return this.availablePlayerIds.pop() ?? null;
	}
}
