import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { init_dice_cache } from './util/user_storage.js';
import fs from 'node:fs';
import config from './config.json' assert {type: 'json'};

//https://discord.com/oauth2/authorize?client_id=1261440091730084003&permissions=598961143457792&scope=bot%20applications.commands%20
//https://discord.com/oauth2/authorize?client_id=1261440091730084003&permissions=563879850600512&integration_type=0&scope=bot
export const client = new Client({
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.GuildMember,
    ]
})

async function main() {
    client.commands = new Collection();
    const commandFiles = fs.readdirSync("./commands/").filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const file_path = "./commands/" + file;
        const command = (await import(file_path)).default;
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${file_path} is missing a required "data" or "execute" property.`);
        }
    }

    const eventFiles = fs.readdirSync("./events").filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const file_path = "./events/" + file;
        const event = (await import(file_path)).default;
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }

    await init_dice_cache();

    client.login(config.token);
}

main();