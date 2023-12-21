import { RawData, WebSocket, WebSocketServer } from "ws";
import { ClientMessage, GameUpdateMessage, JoinGameRequestMessage, JoinGameResponseMessage, TargetPositionUpdateMessage, isJoinGameRequestMessage, isTargetPositionUpdateMessage } from "./messages";
import { ClientManager } from "./ClientManager";
import { Game } from "./Game";
import { ClientId } from "./Client";

export class CommunicationManager {
	private websocketServer: WebSocketServer;

	private clientManager: ClientManager;
	private game: Game;

	constructor(clientManager: ClientManager, game: Game, port: number) {
		this.clientManager = clientManager;
		this.game = game;
		this.websocketServer = new WebSocketServer({ port });

		console.log(`Game server started on port ${port}.`);
	}

	startAcceptingConnections(): void {
		this.websocketServer.on('connection', (connection: WebSocket) => this.handleNewConnection(connection));
	}

	private handleNewConnection(connection: WebSocket): void {
		this.registerNewClient(connection);

		connection.on('error', console.error);
		connection.on('message', (data: RawData): void => this.handleWebsocketMessage(connection, data));
	}

	private registerNewClient(connection: WebSocket) {
		const clientId = this.clientManager.createNewClient();

		connection.clientId = clientId;
	}

	private handleWebsocketMessage(connection: WebSocket, data: RawData): void {
		try {
			const message: ClientMessage = JSON.parse(data.toString());

			if (isJoinGameRequestMessage(message)) {
				this.handleJoinGameRequestMessage(connection, message);
			} else if (isTargetPositionUpdateMessage(message)) {
				this.handleTargetPositionUpdateMessage(connection, message);
			} else {
				throw new Error("Unknown message type received")
			}
		} catch (error) {
			console.log(error);
		}
	}

	private handleJoinGameRequestMessage(connection: WebSocket, message: JoinGameRequestMessage): void {
		const clientState = this.clientManager.clients.get(connection.clientId);

		if (clientState === undefined) {
			throw new Error("Client state doesn't exist");
		}

		if (clientState.playerId !== null) { // can't join game since already joined
			this.sendJoinGameResponseMessage(connection, false);
			return;
		}

		const player = this.game.spawnPlayer();

		if (player === null) { // failed to spawn player (server full)
			this.sendJoinGameResponseMessage(connection, false);
			return;
		}

		clientState.playerId = player.id;

		this.sendJoinGameResponseMessage(connection, true);
	}

	private handleTargetPositionUpdateMessage(connection: WebSocket, message: TargetPositionUpdateMessage): void {
		const clientState = this.clientManager.clients.get(connection.clientId);

		if (clientState === undefined) {
			throw new Error("Client state doesn't exist");
		}

		const playerId = clientState.playerId;

		if (playerId === null) {
			return; // message is meaningless if they aren't an actual player
		}

		const player = this.game.players.get(playerId);

		if (player === undefined) {
			throw new Error("Player not found");
		}

		player.targetPosition = message.position;
	}

	private sendJoinGameResponseMessage(connection: WebSocket, joinSuccessful: boolean): void {
		const clientState = this.clientManager.clients.get(connection.clientId);

		if (clientState === undefined) {
			throw new Error("Client state doesn't exist");
		}

		const message: JoinGameResponseMessage = {
			type: 'joinGameResponse',
			joinSuccessful: joinSuccessful,
			playerId: clientState.playerId ?? undefined
		};

		connection.send(JSON.stringify(message));
	}

	public sendUpdatedGameStateToClients(): void {
		// I am unable to make (connection: WebSocket) work inside the forEach so we're just using any
		this.websocketServer.clients.forEach((connection: any) => {
			const message = this.constructClientGameUpdateMessage(connection.clientId);
			connection.send(JSON.stringify(message));
		});
	}

	private constructClientGameUpdateMessage(clientId: ClientId): GameUpdateMessage {
		const clientState = this.clientManager.clients.get(clientId)

		if (clientState === undefined) {
			throw new Error("Client state doesn't exist");
		}

		const message: GameUpdateMessage = {
			type: 'gameUpdate',
			camera: clientState.camera,
			cells: this.game.cells.getAll(),
			foodParticles: this.game.foodParticles.getAll()
		};

		return message;
	}
}
