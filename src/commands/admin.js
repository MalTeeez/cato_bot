import { SlashCommandBuilder } from "discord.js";
import config from "../config.json" assert { type: "json" };
import { ghostInteractionReply } from "../util/message.js";

export default {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Root for a collection of commands, to be used by admins. you?")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leave")
        .setDescription("Force leave a specific guild")
        .addStringOption((option) =>
          option.setName("guild").setDescription("The guildId of the guild to leave").setRequired(true)
        )
    ),
  async execute(interaction) {
    if (interaction.options.getSubcommand() === "leave") {
      if (interaction.guildId == null && interaction.user.id === config.mika_id) {
        // Hopefully a workaround to not load the client instance during command registration
        const guild = await (await import("../util/message.js")).getGuildByIdExternally(interaction.options.getString("guild"));
        if (guild) {
            try {
                ghostInteractionReply(interaction, "fulfilled task, yay (◕ᴥ◕ʋ)!", 10);
                guild.leave();
            } catch (e) {
                console.log("Failed while trying to leave guild. ERR:")
                console.log(e)
            }
        } else {
          ghostInteractionReply(interaction, "failed to get guild by id!", 10);
        }
      } else {
        ghostInteractionReply(interaction, "fulfilled task, yay ƸӜƷ!", 10);
      }
    }
  },
};
