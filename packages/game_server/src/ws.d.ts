import { WebSocket } from 'ws';

declare module 'ws' {
	export interface WebSocket {
		clientId: number;
	}
}
