import {WebSocketServer} from 'ws';
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


let websocketServer = null;
const clientStates = new Map(); // key: clientId (all client data except player specific data)
const availablePlayerIds = [];
const players = new Map(); // key: playerId
const cells = new CircularObjectMap(0, 0, PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT);
const foodParticles = new CircularObjectMap(0, 0, PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT);

for (let i = MAX_PLAYERS - 1; i >= 0; i--) {
	availablePlayerIds.push(i);
}


class Position {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	
	clone() {
		return new Position(this.x, this.y);
	}
}


class Cell {
	constructor(id, position, mass) {
		this.id = id;
		this.position = position;
		this.mass = mass;
	}
	
	get x() {
		return this.position.x;
	}
	
	get y() {
		return this.position.y;
	}
	
	get radius() {
		return Math.sqrt(this.mass * MASS_TO_AREA_MULTIPLIER / Math.PI);
	}
	
	clone() {
		return new Cell(this.id, this.position.clone(), this.mass);
	}
}


class Player {
	constructor(id, cellId, targetPosition) {
		this.id = id;
		this.cellId = cellId;
		this.targetPosition = targetPosition;
	}
}


class Camera {
	constructor(position, viewAreaWidth) {
		this.position = position;
		this.viewAreaWidth = viewAreaWidth;
	}
}


class FoodParticle {
	constructor(id, position, hue) {
		this.id = id;
		this.position = position;
		this.hue = hue; // 0-255 value representing color
	}

	get x() {
		return this.position.x;
	}
	
	get y() {
		return this.position.y;
	}
	
	get radius() {
		return FOOD_RADIUS;
	}
	
	clone() {
		return new FoodParticle(this.id, this.position.clone(), this.hue);
	}
}


class ClientState {
	constructor(clientId, camera) {
		this.clientId = clientId;
		this.camera = camera;
		this.playerId = null; // null if dead or spectating
	}
}


function startServer() {
	setupGame();

	websocketServer = new WebSocketServer({port: SERVER_PORT});
	websocketServer.on('connection', handleNewConnection);

	setInterval(tick, SERVER_TICK_PERIOD);
}


function setupGame() {
	// TODO
	spawnFood();
}


function spawnFood() {
	for (let i = 0; i < 4000; i++) {
		const id = generateGameObjectId();
		const position = getRandomPosition();
		const hue = getRandomInt(0, 256);
		const foodParticle = new FoodParticle(id, position, hue);
		foodParticles.add(foodParticle);
	}
}


function handleNewConnection(connection) {
	registerNewClient(connection);

	connection.on('error', console.error);
	connection.on('message', (data) => handleWebsocketMessage(connection, data));
}


function registerNewClient(connection) {
	const clientId = generateClientId();
	const camera = createCameraForNewClient();

	const clientState = new ClientState(clientId, camera);
	clientStates.set(clientId, clientState);

	connection.clientId = clientId;
}


function createCameraForNewClient() {
	const position = new Position(PLAY_AREA_WIDTH / 2, PLAY_AREA_HEIGHT / 2);
	const viewAreaWidth = CAMERA_START_VIEW_AREA_WIDTH;

	return new Camera(position, viewAreaWidth);
}


function handleWebsocketMessage(connection, data) {
	try {
		const message = JSON.parse(data);

		switch (message.type) {
			case "joinGameRequest":
				handleJoinGameRequestMessage(connection, message);
				break;
			case "targetPositionUpdate":
				handleTargetPositionUpdateMessage(connection, message);
				break;
		}
	} catch (error) {
		console.log(error);
	}
}


function handleJoinGameRequestMessage(connection, message) {
	const clientState = clientStates.get(connection.clientId);

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


function spawnPlayer() {
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


function getUnusedPlayerId() {
	if (availablePlayerIds.length > 0) {
		return availablePlayerIds.pop();
	} else {
		return null;
	}
}


function handleTargetPositionUpdateMessage(connection, message) {
	const playerId = clientStates.get(connection.clientId).playerId;

	if (playerId === null) {
		return; // message is meaningless if they aren't an actual player
	}

	const player = players.get(playerId);

	player.targetPosition = message.position;
}


function sendJoinGameResponseMessage(connection, joinSuccessful) {
	const clientState = clientStates.get(connection.clientId);

	const message = {
		type: "joinGameResponse",
		joinSuccessful: joinSuccessful,
		playerId: clientState.playerId
	};

	connection.send(JSON.stringify(message));
}


function tick() {
	updateGameState();
	updateClientStates();
	sendUpdatedGameStateToClients();
}


function updateGameState() {
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


function moveCellTowardsTargetPosition(cell, targetPosition, moveDistance) {
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


function updateClientStates() {
	for (const clientState of clientStates.values()) {
		updateCameraForClient(clientState);
	}
}


function updateCameraForClient(clientState) {
	if (clientState.playerId !== null) {
		const player = players.get(clientState.playerId);
		const cell = cells.get(player.cellId);
		clientState.camera.position = cell.position.clone();
	}
}


function sendUpdatedGameStateToClients() {
	websocketServer.clients.forEach((connection) => {
		const message = constructClientGameUpdateMessage(connection.clientId);
		connection.send(JSON.stringify(message));
	});
}


function constructClientGameUpdateMessage(clientId) {
	const clientState = clientStates.get(clientId)

	const message = {
		type: "gameUpdate",
		camera: clientState.camera,
		cells: cells.getAll(),
		foodParticles: foodParticles.getAll()
	};

	return message;
}


function generateClientId() {
	return getRandomInt(0, 2 ** 32);
}


function generateGameObjectId() {
	return getRandomInt(0, 2 ** 32);
}


function getRandomPosition() {
	const x = getRandomInt(0, PLAY_AREA_WIDTH);
	const y = getRandomInt(0, PLAY_AREA_HEIGHT);

	return new Position(x, y);
}


function getRandomInt(min, max) { // Note that min is inclusive and max is exclusive
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min);
}


startServer();
