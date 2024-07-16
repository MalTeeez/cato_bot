import { SlashCommandBuilder } from "discord.js";
import { getRange } from "../util/user_storage.js";

export default {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription(
      "Roll a dice with (default) range of 6, adjustable with /adjust roll $MIN $MAX."
    ),
  async execute(interaction) {
    const range = await getRange(interaction.user.id);
    let num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    interaction.reply(
      "You rolled a " + num + "."
    );
  },
};
