import { Position } from './Position';
import { Camera } from './Camera';
import { Cell } from './Cell';
import { FoodParticle } from './FoodParticle';

export type JoinGameRequestMessage = {
	type: 'joinGameRequest';
};

export type TargetPositionUpdateMessage = {
	type: 'targetPositionUpdate';
	position: Position;
};

export type JoinGameResponseMessage = {
	type: 'joinGameResponse';
	joinSuccessful: boolean;
	playerId: number | undefined;
};

export type GameUpdateMessage = {
	type: 'gameUpdate';
	camera: Camera;
	cells: Cell[];
	foodParticles: FoodParticle[];
};
