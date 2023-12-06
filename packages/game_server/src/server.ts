import {WebSocketServer, WebSocket, RawData} from 'ws';
import {CircularObjectMap} from './circular-object-map.js'


const SERVER_PORT = 4000;
const MAX_PLAYERS = 200;
const PLAY_AREA_WIDTH = 10000;
const PLAY_AREA_HEIGHT = 8000;
const SERVER_TICK_PERIOD = 40; // in milliseconds
const CELL_MOVEMENT_SPEED = 20;
const CAMERA_START_VIEW_AREA_WIDTH = 2000;
const CAMERA_VIEW_AREA_HEIGHT_TO_WIDTH_RATIO = 1080 / 1920;
const PLAYER_STARTING_MASS = 100;
const MASS_TO_AREA_MULTIPLIER = 200;
const FOOD_RADIUS = 12;


// TODO: use these
type Id = number;
type PlayerId = Id;
type ClientId = Id;


let websocketServer: WebSocketServer | null = null;
const clientStates: Map<number, ClientState> = new Map(); // key: clientId (all client data except player specific data)
const availablePlayerIds: number[] = [];
const players: Map<number, Player> = new Map(); // key: playerId
const cells: CircularObjectMap = new CircularObjectMap(0, 0, PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT);
const foodParticles: CircularObjectMap = new CircularObjectMap(0, 0, PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT);

for (let i = MAX_PLAYERS - 1; i >= 0; i--) {
	availablePlayerIds.push(i);
}


class Position {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	clone(): Position {
		return new Position(this.x, this.y);
	}
}


class Cell {
	id: number;
	position: Position;
	mass: number;

	constructor(id: number, position: Position, mass: number) {
		this.id = id;
		this.position = position;
		this.mass = mass;
	}

	get x(): number {
		return this.position.x;
	}

	get y(): number {
		return this.position.y;
	}

	get radius(): number {
		return Math.sqrt(this.mass * MASS_TO_AREA_MULTIPLIER / Math.PI);
	}

	clone(): Cell {
		return new Cell(this.id, this.position.clone(), this.mass);
	}
}


class Player {
	id: number;
	cellId: number;
	targetPosition: Position | null;

	constructor(id: number, cellId: number, targetPosition: Position | null) {
		this.id = id;
		this.cellId = cellId;
		this.targetPosition = targetPosition;
	}
}


class Camera {
	position: Position;
	viewAreaWidth: number;

	constructor(position: Position, viewAreaWidth: number) {
		this.position = position;
		this.viewAreaWidth = viewAreaWidth;
	}
}


class FoodParticle {
	id: number;
	position: Position;
	hue: number; // 0-255 value representing color

	constructor(id: number, position: Position, hue: number) {
		this.id = id;
		this.position = position;
		this.hue = hue;
	}

	get x(): number {
		return this.position.x;
	}

	get y(): number {
		return this.position.y;
	}

	get radius(): number {
		return FOOD_RADIUS;
	}

	clone(): FoodParticle {
		return new FoodParticle(this.id, this.position.clone(), this.hue);
	}
}


class ClientState {
	clientId: number;
	camera: Camera;
	playerId: number | null; // null if dead or spectating

	constructor(clientId: number, camera: Camera) {
		this.clientId = clientId;
		this.camera = camera;
		this.playerId = null;
	}
}


type JoinGameRequestMessage = {
	type: 'joinGameRequest';
};


type TargetPositionUpdateMessage = {
	type: 'targetPositionUpdate';
	position: Position;
};


type JoinGameResponseMessage = {
	type: 'joinGameResponse';
	joinSuccessful: boolean;
	playerId: number | undefined;
};


type GameUpdateMessage = {
	type: 'gameUpdate';
	camera: Camera;
	cells: Cell[];
	foodParticles: FoodParticle[];
};


function startServer(): void {
	setupGame();

	websocketServer = new WebSocketServer({port: SERVER_PORT});
	websocketServer.on('connection', handleNewConnection);

	console.log(`Listening on port ${SERVER_PORT}.`);

	setInterval(tick, SERVER_TICK_PERIOD);
}


function setupGame(): void {
	// TODO
	spawnFood();
}


function spawnFood(): void {
	for (let i = 0; i < 4000; i++) {
		const id = generateGameObjectId();
		const position = getRandomPosition();
		const hue = getRandomInt(0, 256);
		const foodParticle = new FoodParticle(id, position, hue);
		foodParticles.add(foodParticle);
	}
}


function handleNewConnection(connection: WebSocket): void {
	registerNewClient(connection);

	connection.on('error', console.error);
	connection.on('message', (data: RawData): void => handleWebsocketMessage(connection, data));
}


function registerNewClient(connection: WebSocket): void {
	const clientId = generateClientId();
	const camera = createCameraForNewClient();

	const clientState = new ClientState(clientId, camera);
	clientStates.set(clientId, clientState);

	connection.clientId = clientId;
}


function createCameraForNewClient(): Camera {
	const position = new Position(PLAY_AREA_WIDTH / 2, PLAY_AREA_HEIGHT / 2);
	const viewAreaWidth = CAMERA_START_VIEW_AREA_WIDTH;

	return new Camera(position, viewAreaWidth);
}


function handleWebsocketMessage(connection: WebSocket, data: RawData): void {
	try {
		const message = JSON.parse(data.toString());

		switch (message.type) {
			case "joinGameRequest":
				handleJoinGameRequestMessage(connection, message);
				break;
			case "targetPositionUpdate":
				handleTargetPositionUpdateMessage(connection, message);
				break;
			default:
				throw new Error("Unknown message type received")
		}
	} catch (error) {
		console.log(error);
	}
}


function handleJoinGameRequestMessage(connection: WebSocket, message: JoinGameRequestMessage): void {
	const clientState = clientStates.get(connection.clientId);

	if (clientState === undefined) {
		throw new Error("Client state doesn't exist");
	}

	if (clientState.playerId !== null) { // can't join game since already joined
		sendJoinGameResponseMessage(connection, false);
		return;
	}

	const player = spawnPlayer();

	if (player === null) { // failed to spawn player (server full)
		sendJoinGameResponseMessage(connection, false);
		return;
	}

	clientState.playerId = player.id;

	sendJoinGameResponseMessage(connection, true);
}


function spawnPlayer(): Player | null {
	const playerId = getUnusedPlayerId();

	if (playerId === null) {
		return null; // can't spawn player because server is full
	}

	const cellId = generateGameObjectId();
	const position = getRandomPosition();
	const cell = new Cell(cellId, position, PLAYER_STARTING_MASS);
	cells.add(cell);

	const player = new Player(playerId, cellId, null);
	players.set(playerId, player);

	return player;
}


function getUnusedPlayerId(): number | null {
	return availablePlayerIds.pop() ?? null;
}


function handleTargetPositionUpdateMessage(connection: WebSocket, message: TargetPositionUpdateMessage): void {
	const clientState = clientStates.get(connection.clientId);

	if (clientState === undefined) {
		throw new Error("Client state doesn't exist");
	}

	const playerId = clientState.playerId;

	if (playerId === null) {
		return; // message is meaningless if they aren't an actual player
	}

	const player = players.get(playerId);

	if (player === undefined) {
		throw new Error("Player not found");
	}

	player.targetPosition = message.position;
}


function sendJoinGameResponseMessage(connection: WebSocket, joinSuccessful: boolean): void {
	const clientState = clientStates.get(connection.clientId);

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


function tick(): void {
	updateGameState();
	updateClientStates();
	sendUpdatedGameStateToClients();
}


function updateGameState(): void {
	for (const player of players.values()) {
		const playerCell = cells.get(player.cellId);

		if (player.targetPosition !== null) {
			moveCellTowardsTargetPosition(playerCell, player.targetPosition, CELL_MOVEMENT_SPEED);
		}

		// TODO: better covering algorithm
		const foodParticlesCovered = foodParticles.findSmallerObjectsIntersecting(playerCell);
		for (const foodParticle of foodParticlesCovered) {
			foodParticles.remove(foodParticle.id);
			playerCell.mass += 10;
		}

		cells.add(playerCell);
	}
}


function moveCellTowardsTargetPosition(cell: Cell, targetPosition: Position, moveDistance: number): void {
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


function updateClientStates(): void {
	for (const clientState of clientStates.values()) {
		updateCameraForClient(clientState);
	}
}


function updateCameraForClient(clientState: ClientState): void {
	if (clientState.playerId !== null) {
		const player = players.get(clientState.playerId);

		if (player === undefined) {
			throw new Error("Player not found");
		}

		const cell = cells.get(player.cellId);
		clientState.camera.position = cell.position.clone();
	}
}


function sendUpdatedGameStateToClients(): void {
	if (websocketServer === null) {
		throw new Error("WebSocket server is not initialized");
	}

	// I am unable to make (connection: WebSocket) work inside the forEach so we're just using any
	websocketServer.clients.forEach((connection: any) => {
		const message = constructClientGameUpdateMessage(connection.clientId);
		connection.send(JSON.stringify(message));
	});
}


function constructClientGameUpdateMessage(clientId: number): GameUpdateMessage {
	const clientState = clientStates.get(clientId)

	if (clientState === undefined) {
		throw new Error("Client state doesn't exist");
	}

	const message: GameUpdateMessage = {
		type: 'gameUpdate',
		camera: clientState.camera,
		cells: cells.getAll(),
		foodParticles: foodParticles.getAll()
	};

	return message;
}


function generateClientId(): number {
	return getRandomInt(0, 2 ** 32);
}


function generateGameObjectId(): number {
	return getRandomInt(0, 2 ** 32);
}


function getRandomPosition(): Position {
	const x = getRandomInt(0, PLAY_AREA_WIDTH);
	const y = getRandomInt(0, PLAY_AREA_HEIGHT);

	return new Position(x, y);
}


function getRandomInt(min: number, max: number): number { // Note that min is inclusive and max is exclusive
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min);
}


startServer();
