import {WebSocketServer} from 'ws';


const SERVER_PORT = 4000;
const MAX_PLAYERS = 200;
const GAME_AREA_WIDTH = 500;
const GAME_AREA_HEIGHT = 400;
const SERVER_TICK_PERIOD = 40; // in milliseconds
const CELL_MOVEMENT_SPEED = 20;


let websocketServer = null;
const clientStates = new Map(); // key: clientId (all client data except player specific data)
const players = new Map(); // key: playerId
const cells = new Map(); // key: cellId
const availablePlayerIds = [];

for (let i = MAX_PLAYERS - 1; i >= 0; i--) {
	availablePlayerIds.push(i);
}


class Position {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}


class Cell {
	constructor(id, position) {
		this.id = id;
		this.position = position;
	}
}


class Player {
	constructor(id, cellId, targetPosition) {
		this.id = id;
		this.cellId = cellId;
		this.targetPosition = targetPosition;
	}
}


class ClientState {
	constructor(clientId) {
		this.clientId = clientId;
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
}


function handleNewConnection(connection) {
	registerNewClient(connection);

	connection.on('error', console.error);
	connection.on('message', (data) => handleWebsocketMessage(connection, data));
}


function registerNewClient(connection) {
	const clientId = generateClientId();

	const clientState = new ClientState(clientId);
	clientStates.set(clientId, clientState);

	connection.clientId = clientId;
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
	const cell = new Cell(cellId, position);
	cells.set(cellId, cell);

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
	sendUpdatedGameStateToClients();
}


function updateGameState() {
	for (const player of players.values()) {
		const playerCell = cells.get(player.cellId);

		if (player.targetPosition !== null) {
			moveCellTowardsTargetPosition(playerCell, player.targetPosition, CELL_MOVEMENT_SPEED);
		}
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


function sendUpdatedGameStateToClients() {
	websocketServer.clients.forEach((connection) => {
		const message = constructClientGameUpdateMessage(connection.clientId);
		connection.send(JSON.stringify(message));
	});
}


function constructClientGameUpdateMessage(clientId) {
	const message = {
		type: "gameUpdate",
		cells: Array.from(cells.values())
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
	const x = getRandomInt(0, GAME_AREA_WIDTH);
	const y = getRandomInt(0, GAME_AREA_HEIGHT);

	return new Position(x, y);
}


function getRandomInt(min, max) { // Note that min is inclusive and max is exclusive
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min);
}


startServer();
