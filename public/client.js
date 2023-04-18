const SERVER_ADDRESS = "ws://localhost:4000";
const DRAW_RATE = 60; // FPS
const SERVER_TICK_PERIOD = 40; // in milliseconds
const CELL_RADIUS = 50;
const CELL_COLOR = "#0095DD";


const canvas = document.getElementById("gameArea");
const ctx = canvas.getContext("2d");


let webSocket = null;
let playerId = null;
let playerTarget = null;
const players = new Map(); // key: playerId
const cells = new Map(); // key: cellId


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
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	for (const cell of cells.values()) {
		drawCell(cell);
	}
}


function drawCell(cell) {
	ctx.beginPath();
	ctx.arc(cell.position.x, cell.position.y, CELL_RADIUS, 0, Math.PI * 2);
	ctx.fillStyle = CELL_COLOR;
	ctx.fill();
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
	cells.clear();

	for (const cell of message.cells) {
		cells.set(cell.id, cell);
	}
}


initCanvas();
connectToServer();
