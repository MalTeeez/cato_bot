import { SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription(
            "pong(?!)"
        ),
    async execute(interaction) {
        interaction.reply(
            "I'm not a braindead spider, did you think I would say something dumb like \"pong ? \" \nNo way. Idiot."
        );
    },
};