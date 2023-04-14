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


function moveCellTowardsTarget(cell, targetX, targetY, moveDistance) {
	const dx = targetX - cell.x;
	const dy = targetY - cell.y;

	const dist = Math.sqrt(dx * dx + dy * dy);

	if (dist < moveDistance) {
		cell.x = targetX;
		cell.y = targetY;
		return;
	}

	const dxNorm = dx / dist;
	const dyNorm = dy / dist;

	cell.x += dxNorm * moveDistance;
	cell.y += dyNorm * moveDistance;
}


function draw() {
	moveCellTowardsTarget(playerCell, targetX, targetY, 4);

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
