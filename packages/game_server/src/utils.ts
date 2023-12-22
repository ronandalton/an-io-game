import { GameObjectId } from './GameObject';
import { Position } from './Position';
import { PLAY_AREA_WIDTH } from './constants';
import { PLAY_AREA_HEIGHT } from './constants';

export function generateGameObjectId(): GameObjectId {
	return getRandomInt(0, 2 ** 32);
}

export function getRandomPosition(): Position {
	const x = getRandomInt(0, PLAY_AREA_WIDTH);
	const y = getRandomInt(0, PLAY_AREA_HEIGHT);

	return new Position(x, y);
}

export function getRandomInt(minInclusive: number, maxExclusive: number): number {
	minInclusive = Math.ceil(minInclusive);
	maxExclusive = Math.floor(maxExclusive);
	return Math.floor(Math.random() * (maxExclusive - minInclusive) + minInclusive);
}
