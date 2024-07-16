import { SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("meatball")
        .setDescription(
            "what could it be other than MEATBALL"
        ),
    async execute(interaction) {
        await interaction.reply({ content: "delivering meatball...", ephemeral: true });
        await interaction.deleteReply();
        interaction.channel.send({ files: ["../cache/meatball.jpg"], content: "Fuckingl .meatball ." })
    },
};