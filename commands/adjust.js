import { SlashCommandBuilder } from "discord.js";
import { addOrAdjust } from "../util/user_storage.js";

export default {
  data: new SlashCommandBuilder()
    .setName("adjust")
    .setDescription("Adjust permanent command parameters")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("roll")
        .setDescription("Parameter options for rolling a dice with /roll")
        .addIntegerOption((option) => option.setName("min").setDescription("The minimum value the dice can roll to.").setRequired(true))
        .addIntegerOption((option) => option.setName("max").setDescription("The maximum value the dice can roll to.").setRequired(true))
    ),
  async execute(interaction) {
    if (interaction.options.getSubcommand() === "roll" && interaction.options.getInteger("min") && interaction.options.getInteger("max")) {
      addOrAdjust(interaction.user.id, interaction.options.getInteger("min"), interaction.options.getInteger("max"))
      interaction.reply("Adjusted dice roll to land between " + interaction.options.getInteger("min") + " and " + interaction.options.getInteger("max") + ".");
    } else {
      interaction.reply("Subcommand not specified or found.");
    }
  },
};
