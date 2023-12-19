import { Game } from './Game';
import { ClientManager } from './ClientManager';
import { CommunicationManager } from './CommunicationManager';
import { SERVER_PORT, SERVER_TICK_PERIOD } from './constants';

export class GameServer {
	private game: Game;
	private clientManager: ClientManager;
	private communicationManager: CommunicationManager;
	private started: boolean;

	constructor() {
		this.game = new Game();
		this.clientManager = new ClientManager(this.game);
		this.communicationManager = new CommunicationManager(this.clientManager, this.game, SERVER_PORT);
		this.started = false;
	}

	start(): void {
		if (this.started) {
			return;
		}

		this.game.setup();
		this.communicationManager.startAcceptingConnections();

		setInterval(() => this.tick(), SERVER_TICK_PERIOD);

		this.started = true;
	}

	private tick(): void {
		this.game.update();
		this.clientManager.update();
		this.communicationManager.sendUpdatedGameStateToClients();
	}
}
