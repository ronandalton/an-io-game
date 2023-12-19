import { Client, ClientId } from "./Client";
import { Game } from "./Game";
import { getRandomInt } from "./utils";

export class ClientManager {
	clients: Map<ClientId, Client>;

	private game: Game;

    constructor(game: Game) {
		this.game = game;

		this.clients = new Map();
    }

	createNewClient(): ClientId {
		const clientId = ClientManager.generateClientId();

		const client = new Client(clientId);
		this.clients.set(clientId, client);

        return clientId
	}

	update(): void {
		for (const client of this.clients.values()) {
            client.update(this.game);
		}
	}

    private static generateClientId(): number {
        return getRandomInt(0, 2 ** 32);
    }
}



