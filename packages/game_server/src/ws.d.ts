import {WebSocket, WebSocketServer} from 'ws';

declare module 'ws' {
	interface WebSocket {
		clientId: number;
	}

	interface WebSocketServer {
		clients: Set<WebSocket>; // I shouldn't need to do this...
	}
}
