import { Position } from './Position';
import { Camera } from './Camera';
import { Cell } from './Cell';
import { FoodParticle } from './FoodParticle';
import { PlayerId } from './Player';

export type ClientMessageType =
	| 'joinGameRequest'
	| 'targetPositionUpdate';

export type ServerMessageType =
	| 'joinGameResponse'
	| 'gameUpdate';

export type MessageType = ClientMessageType | ServerMessageType;

export type ClientMessage = {
	type: ClientMessageType;
}

export type ServerMessage = {
	type: ServerMessageType;
}

export type Message = ClientMessage | ServerMessage;

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
	playerId: PlayerId | undefined;
};

export type GameUpdateMessage = {
	type: 'gameUpdate';
	camera: Camera;
	cells: Cell[];
	foodParticles: FoodParticle[];
};

export function isJoinGameRequestMessage(message: Message): message is JoinGameRequestMessage {
	return message.type === 'joinGameRequest';
}

export function isTargetPositionUpdateMessage(message: Message): message is TargetPositionUpdateMessage {
	return message.type === 'targetPositionUpdate';
}

export function isJoinGameResponseMessage(message: Message): message is JoinGameResponseMessage {
	return message.type === 'joinGameResponse';
}

export function isGameUpdateMessage(message: Message): message is GameUpdateMessage {
	return message.type === 'gameUpdate';
}
