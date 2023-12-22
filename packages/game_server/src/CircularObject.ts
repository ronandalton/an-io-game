import { GameObject, GameObjectId } from './GameObject';

export type CircularObjectId = GameObjectId;

export interface CircularObject extends GameObject {
	radius: number;
}
