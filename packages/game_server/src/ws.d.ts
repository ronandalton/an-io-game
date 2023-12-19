import { WebSocket } from 'ws';
import { ClientId } from './Client';

declare module 'ws' {
	export interface WebSocket {
		clientId: ClientId;
	}
}
