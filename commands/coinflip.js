import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder().setName("coinflip").setDescription("Flip a coin! But are you sure you can pay the price?"),
  async execute(interaction) {
    const flip_button = new ButtonBuilder().setCustomId("coinflip").setLabel("* flip coin *").setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(flip_button);

    await interaction.reply({
      content: "Heads, you win. Tails, you lose. \n(Either way, you're a loser.)",
      components: [row],
    });
  },
};

export async function handleFlipInteraction(interaction) {
    if (Math.floor(Math.random() * 2) == 1) {
        interaction.reply("**Shit, fuck. It's heads.**\nYou win.")
    } else {
        interaction.reply("**ALRIGHT, fuck YEAH!**\nI'm the winner, you're the loser! It's tails, baby!")
    }
}