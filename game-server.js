import {WebSocketServer} from 'ws';

const wss = new WebSocketServer({port: 4000});


wss.on('connection', (ws) => {
	ws.on('error', console.error);

	ws.on('message', (data) => {
		//console.log('received: %s', data);
		try {
			const message = JSON.parse(data);

			switch (message.type) {
				case "targetPositionUpdate":
					targetX = message.targetX;
					targetY = message.targetY;
					break;
			}
		} catch (error) {
			console.log(error);
		}
	});
});


class Cell {
	constructor(x, y, radius, color) {
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.color = color;
	}
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


function tick() {
	moveCellTowardsTarget(playerCell, targetX, targetY, 20);

	const message = {
		type: "cellUpdate",
		cellX: playerCell.x,
		cellY: playerCell.y
	};

	wss.clients.forEach((client) => {
		client.send(JSON.stringify(message));
	});
}


setInterval(tick, 100);
