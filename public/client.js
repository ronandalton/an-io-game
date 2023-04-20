const SERVER_ADDRESS = "ws://localhost:4000";
const DRAW_RATE = 60; // FPS
const SERVER_TICK_PERIOD = 40; // in milliseconds
const EXPECTED_UPDATE_DELAY_VARIANCE = 20; // in milliseconds, larger = more delay but less jittery
const LERP_PERIOD_FLEXIBILITY = 0.2; // 0-1, lower = more stable movement speed but less adaptive to network jitter
const CELL_RADIUS = 50;
const CELL_COLOR = "#0095DD";


const canvas = document.getElementById("gameArea");
const ctx = canvas.getContext("2d");


let webSocket = null;
let playerId = null;
let playerTarget = null;
let gameStateBuffer = null;
let currentGameState = null;


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


class GameState {
	constructor(cells = new Map()) {
		this.cells = cells; // map with key: cellId
	}
};


class GameStateBufferEntry {
	constructor(gameState, receivedTime, lerpTimePoint) {
		this.gameState = gameState;
		this.receivedTime = receivedTime; // NOTE: this currently isn't used for anything
		this.lerpTimePoint = lerpTimePoint;
	}
}


function init() {
	currentGameState = new GameState();
	gameStateBuffer = [];

	initCanvas();
}


function initCanvas() {
	resizeCanvasToFitWindow();
	window.addEventListener("resize", resizeCanvasToFitWindow);
	document.addEventListener("mousemove", handleMouseMovedEvent);
	setInterval(draw, 1000 / DRAW_RATE);
}


function resizeCanvasToFitWindow() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	draw();
}


function draw() {
	updateCurrentGameState();

	clearScreen();
	drawCells();
}


function clearScreen() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}


function drawCells() {
	const cells = currentGameState.cells.values();

	for (const cell of cells) {
		drawCell(cell);
	}
}


function drawCell(cell) {
	ctx.beginPath();
	ctx.arc(cell.position.x, cell.position.y, CELL_RADIUS, 0, Math.PI * 2);
	ctx.fillStyle = CELL_COLOR;
	ctx.fill();
}


function updateCurrentGameState() {
	const currentTime = Date.now();

	removeOldStatesFromGameStateBuffer(currentTime);

	if (gameStateBuffer.length >= 2) {
		const previousGameState = gameStateBuffer[0].gameState;
		const nextGameState = gameStateBuffer[1].gameState;
		const timeDifference = currentTime - gameStateBuffer[0].lerpTimePoint;
		const lerpDuration = gameStateBuffer[1].lerpTimePoint - gameStateBuffer[0].lerpTimePoint;
		const lerpValue = Math.min(timeDifference / lerpDuration, 1);

		currentGameState = lerpGameStates(previousGameState, nextGameState, lerpValue);
	}
}


function removeOldStatesFromGameStateBuffer(currentTime) {
	while (gameStateBuffer.length > 2 && gameStateBuffer[1].lerpTimePoint <= currentTime) {
		gameStateBuffer.shift(); // removes first element
	}
}


function lerpGameStates(state1, state2, t) {
	const lerpedCells = lerpObjectMapsOfSameType(state1.cells, state2.cells, t, lerpCell);

	return new GameState(lerpedCells);
}


function lerpObjectMapsOfSameType(objectMap1, objectMap2, t, objectLerpFunction) {
	const lerpedObjects = new Map();

	for (const [key, object1] of objectMap1) {
		if (objectMap2.has(key)) {
			const object2 = objectMap2.get(key);
			const lerpedObject = objectLerpFunction(object1, object2, t);
			lerpedObjects.set(key, lerpedObject);
		}
	}

	return lerpedObjects;
}


function lerpCell(cell1, cell2, t) {
	const lerpedPosition = lerpPosition(cell1.position, cell2.position, t);

	return new Cell(cell1.id, lerpedPosition);
}


function lerpPosition(pos1, pos2, t) {
	return new Position(lerp(pos1.x, pos2.x, t), lerp(pos1.y, pos2.y, t));
}


function lerp(a, b, t) {
	return a * (1 - t) + b * t;
}


function handleMouseMovedEvent(event) {
	playerTarget = new Position(event.offsetX, event.offsetY);
}


function connectToServer() {
	webSocket = new WebSocket(SERVER_ADDRESS);

	webSocket.addEventListener("open", handleWebSocketOpenedEvent);

	webSocket.addEventListener("message", handleWebSocketMessageEvent);
}


function handleWebSocketOpenedEvent(event) {
	sendJoinGameRequest();
}


function sendJoinGameRequest() {
	const message = {
		type: "joinGameRequest",
	};

	webSocket.send(JSON.stringify(message));
}


function sendTargetPosition() {
	const message = {
		type: "targetPositionUpdate",
		position: playerTarget
	};

	webSocket.send(JSON.stringify(message));
}


function handleWebSocketMessageEvent(event) {
	const message = JSON.parse(event.data);

	switch (message.type) {
		case "joinGameResponse":
			handleJoinGameResponseMessage(message);
			break;
		case "gameUpdate":
			handleGameUpdateMessage(message);
			break;
	}
}


function handleJoinGameResponseMessage(message) {
	if (message.joinSuccessful) {
		playerId = message.playerId;

		setInterval(sendTargetPosition, 1000 / SERVER_TICK_PERIOD);
	}
}


function handleGameUpdateMessage(message) {
	const cells = new Map();

	for (const cell of message.cells) {
		cells.set(cell.id, cell);
	}

	const newGameState = new GameState(cells);

	addGameStateToBuffer(newGameState);
}


function addGameStateToBuffer(gameState) {
	const currentTime = Date.now();

	if (gameStateBuffer.length >= 1 && currentTime > gameStateBuffer.at(-1).lerpTimePoint) {
		// lerping has been stalled with no new game data from server,
		// reset last lerp point to current time so objects don't teleport on resume
		gameStateBuffer.at(-1).lerpTimePoint = currentTime;
	}

	const lerpTimePoint = calculateLerpTimePointForNewGameStateReceived(currentTime);
	const bufferEntry = new GameStateBufferEntry(gameState, currentTime, lerpTimePoint);

	gameStateBuffer.push(bufferEntry);
}


function calculateLerpTimePointForNewGameStateReceived(receivedTime) {
	const targetLerpTimePoint = receivedTime + SERVER_TICK_PERIOD + EXPECTED_UPDATE_DELAY_VARIANCE;

	if (gameStateBuffer.length === 0) {
		return targetLerpTimePoint;
	}
	
	const lastLerpTimePoint = gameStateBuffer.at(-1).lerpTimePoint;
	const projectedLerpTimePoint = lastLerpTimePoint + SERVER_TICK_PERIOD;
	return lerp(projectedLerpTimePoint, targetLerpTimePoint, LERP_PERIOD_FLEXIBILITY);
}


init();
connectToServer();
