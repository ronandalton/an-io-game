const canvas = document.getElementById("gameArea");
const ctx = canvas.getContext("2d");


class Cell {
	constructor(x, y, radius, color) {
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.color = color;
	}
}


function drawCell(cell) {
	ctx.beginPath();
	ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
	ctx.fillStyle = cell.color;
	ctx.fill();
}


const playerCell = new Cell(50, 50, 30, "#0095DD");
let targetX = 50;
let targetY = 50;


function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawCell(playerCell);
}


function updateTargetPosition(event) {
	targetX = event.offsetX;
	targetY = event.offsetY;
}


function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	draw();
}


document.addEventListener("mousemove", updateTargetPosition);
window.addEventListener("resize", resizeCanvas);


resizeCanvas();

setInterval(draw, 1000 / 100);


const webSocket = new WebSocket("ws://localhost:4000");


function sendTargetPosition() {
	const message = {
		type: "targetPositionUpdate",
		targetX: targetX,
		targetY: targetY
	};

	webSocket.send(JSON.stringify(message));
}


webSocket.onopen = (event) => {
	setInterval(sendTargetPosition, 40);
};


webSocket.onmessage = (event) => {
	console.log(event.data);

	const message = JSON.parse(event.data);

	switch (message.type) {
		case "cellUpdate":
			playerCell.x = message.cellX;
			playerCell.y = message.cellY;
			break;
	}
}

