import { Events } from "discord.js";
import { client } from "../index.js";

export default {
    name: Events.MessageCreate,
    execute(message) {
        if (message.author.id != client.user.id) {
            const roundtrip_time = ((Date.now() - message.createdAt) / 1000).toFixed(3);
            message.author.send("Received message \"" + message.content + "\" with a delay of " + roundtrip_time + "ms.")
        }
    },
};