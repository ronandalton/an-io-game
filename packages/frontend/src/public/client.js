const SERVER_ADDRESS = "ws://localhost:4000";
const DRAW_RATE = 60; // FPS
const CAMERA_VIEW_AREA_HEIGHT_TO_WIDTH_RATIO = 1080 / 1920;
const SERVER_TICK_PERIOD = 40; // in milliseconds
const EXPECTED_UPDATE_DELAY_VARIANCE = 20; // in milliseconds, larger = more delay but less jittery
const LERP_PERIOD_FLEXIBILITY = 0.2; // 0-1, lower = more stable movement speed but less adaptive to network jitter
const MASS_TO_AREA_MULTIPLIER = 200;
const FOOD_RADIUS = 12;
const CELL_COLOR = "#0095DD";
const GRID_LINE_COLOR = "#AAAAAA";
const GRID_LINE_SPACING = 40;


const canvas = document.getElementById("gameArea");
const ctx = canvas.getContext("2d");


let webSocket = null;
let playerId = null;
let playerTarget = null; // in screen space
let gameStateBuffer = null;
let currentGameState = null;


class Position {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}


class Cell {
	constructor(id, position, mass) {
		this.id = id;
		this.position = position;
		this.mass = mass;
	}
	
	get radius() {
		return Math.sqrt(this.mass * MASS_TO_AREA_MULTIPLIER / Math.PI);
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
	
	get radius() {
		return FOOD_RADIUS;
	}
}


class GameState {
	constructor(camera = new Camera(), cells = new Map(), foodParticles = new Map()) {
		this.camera = camera;
		this.cells = cells; // map with key: cellId
		this.foodParticles = foodParticles;
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

	if (currentGameState !== null) {
		drawGrid();
		drawFoodParticles();
		drawCells();
	}
}


function clearScreen() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}


function drawGrid() {
	drawHorizontalGridLines();
	drawVerticalGridLines();
}


function drawHorizontalGridLines() {
	const topScreenBoundaryGameSpaceYValue = screenSpaceYToGameSpace(0);
	const bottomScreenBoundaryGameSpaceYValue = screenSpaceYToGameSpace(canvas.height - 1);

	const yPositionValuesOfGridLines = getGridLineCoordsBetween(
		topScreenBoundaryGameSpaceYValue, bottomScreenBoundaryGameSpaceYValue);

	for (const lineYPosition of yPositionValuesOfGridLines) {
		const distanceAcrossScreen = gameSpaceYToScreenSpace(lineYPosition);
		drawGridLine(distanceAcrossScreen, false);
	}
}


function drawVerticalGridLines() {
	const leftScreenBoundaryGameSpaceXValue = screenSpaceXToGameSpace(0);
	const rightScreenBoundaryGameSpaceXValue = screenSpaceXToGameSpace(canvas.width - 1);

	const xPositionValuesOfGridLines = getGridLineCoordsBetween(
		leftScreenBoundaryGameSpaceXValue, rightScreenBoundaryGameSpaceXValue);

	for (const lineXPosition of xPositionValuesOfGridLines) {
		const distanceAcrossScreen = gameSpaceXToScreenSpace(lineXPosition);
		drawGridLine(distanceAcrossScreen, true);
	}
}


function getGridLineCoordsBetween(gameSpaceCoord1, gameSpaceCoord2) {
	// note that "coord" refers to a singe axis value such as x or y,
	// as opposed to position that refers to the combination of x and y

	const coords = [];

	const lowerBound = Math.min(gameSpaceCoord1, gameSpaceCoord2);
	const upperBound = Math.max(gameSpaceCoord1, gameSpaceCoord2);

	let lineNum = Math.ceil(lowerBound / GRID_LINE_SPACING);

	let coord;
	while ((coord = lineNum * GRID_LINE_SPACING) <= upperBound) {
		coords.push(coord);
		lineNum++;
	}

	return coords;
}


function drawGridLine(distanceAcrossScreen, isVertical) {
	let lineStartPos;
	let lineEndPos;

	if (isVertical) {
		lineStartPos = new Position(distanceAcrossScreen, 0);
		lineEndPos = new Position(distanceAcrossScreen, canvas.height - 1);
	} else {
		lineStartPos = new Position(0, distanceAcrossScreen);
		lineEndPos = new Position(canvas.width - 1, distanceAcrossScreen);
	}

	ctx.beginPath();
	ctx.moveTo(lineStartPos.x, lineStartPos.y);
	ctx.lineTo(lineEndPos.x, lineEndPos.y);
	ctx.strokeStyle = GRID_LINE_COLOR;
	ctx.stroke();
}


function drawFoodParticles() {
	const foodParticles = currentGameState.foodParticles.values();
	
	for (const foodParticle of foodParticles) {
		drawFoodParticle(foodParticle);
	}
}


function drawFoodParticle(foodParticle) {
	const screenPos = gameSpaceToScreenSpace(foodParticle.position);
	const radius = foodParticle.radius * getGameSpaceToScreenSpaceScalingFactor();
	const color = `hsl(${foodParticle.hue / 256 * 360} 100% 50%)`;
	
	ctx.beginPath();
	ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
}


function drawCells() {
	const cells = currentGameState.cells.values();

	for (const cell of cells) {
		drawCell(cell);
	}
}


function drawCell(cell) {
	const screenPos = gameSpaceToScreenSpace(cell.position);
	const radius = cell.radius * getGameSpaceToScreenSpaceScalingFactor();

	ctx.beginPath();
	ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
	ctx.fillStyle = CELL_COLOR;
	ctx.fill();
}


function screenSpaceToGameSpace(position) {
	const scalingFactor = getGameSpaceToScreenSpaceScalingFactor();
	const cameraPos = currentGameState.camera.position;
	const screenCenter = new Position(canvas.width / 2, canvas.height / 2);

	return new Position(
		(position.x - screenCenter.x) / scalingFactor + cameraPos.x,
		(position.y - screenCenter.y) / scalingFactor + cameraPos.y
	);
}


function gameSpaceToScreenSpace(position) {
	const scalingFactor = getGameSpaceToScreenSpaceScalingFactor();
	const cameraPos = currentGameState.camera.position;
	const screenCenter = new Position(canvas.width / 2, canvas.height / 2);

	return new Position(
		(position.x - cameraPos.x) * scalingFactor + screenCenter.x,
		(position.y - cameraPos.y) * scalingFactor + screenCenter.y
	);
}


function getGameSpaceToScreenSpaceScalingFactor() {
	const viewAreaWidth = currentGameState.camera.viewAreaWidth;
	const viewAreaHeight = viewAreaWidth * CAMERA_VIEW_AREA_HEIGHT_TO_WIDTH_RATIO;

	return Math.max(canvas.width / viewAreaWidth, canvas.height / viewAreaHeight);
}


function screenSpaceXToGameSpace(x) { return screenSpaceToGameSpace(new Position(x, 0)).x; }
function screenSpaceYToGameSpace(y) { return screenSpaceToGameSpace(new Position(0, y)).y; }
function gameSpaceXToScreenSpace(x) { return gameSpaceToScreenSpace(new Position(x, 0)).x; }
function gameSpaceYToScreenSpace(y) { return gameSpaceToScreenSpace(new Position(0, y)).y; }


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
	const lerpedCamera = lerpCamera(state1.camera, state2.camera, t);
	const lerpedCells = lerpObjectMapsOfSameType(state1.cells, state2.cells, t, lerpCell);
	const lerpedFoodParticles = lerpObjectMapsOfSameType(state1.foodParticles,
		state2.foodParticles, t, lerpFoodParticle);

	return new GameState(lerpedCamera, lerpedCells, lerpedFoodParticles);
}


function lerpCamera(camera1, camera2, t) {
	const lerpedPosition = lerpPosition(camera1.position, camera2.position, t);
	const lerpedViewAreaWidth = lerp(camera1.viewAreaWidth, camera2.viewAreaWidth, t);

	return new Camera(lerpedPosition, lerpedViewAreaWidth);
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
	const lerpedMass = lerp(cell1.mass, cell2.mass, t);

	return new Cell(cell1.id, lerpedPosition, lerpedMass);
}


function lerpFoodParticle(foodParticle1, foodParticle2, t) {
	const lerpedPosition = lerpPosition(foodParticle1.position, foodParticle2.position, t);

	// hue is assumed constant
	return new FoodParticle(foodParticle1.id, lerpedPosition, foodParticle1.hue);
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
	if (playerTarget === null || currentGameState === null) {
		return;
	}

	const message = {
		type: "targetPositionUpdate",
		position: screenSpaceToGameSpace(playerTarget)
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
	const camera = Object.assign(new Camera, message.camera);

	const cells = new Map();
	for (const cell of message.cells) {
		cells.set(cell.id, Object.assign(new Cell, cell));
	}

	const foodParticles = new Map();
	for (const foodParticle of message.foodParticles) {
		foodParticles.set(foodParticle.id, Object.assign(new FoodParticle, foodParticle));
	}

	const newGameState = new GameState(camera, cells, foodParticles);

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
