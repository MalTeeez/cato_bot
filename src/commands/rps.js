import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  SlashCommandBuilder,
  userMention,
} from "discord.js";

export default {
  data: new SlashCommandBuilder().setName("rps").setDescription("Face me off in rock-paper-scissors!"),
  async execute(interaction) {
    const rps_combo = new StringSelectMenuBuilder()
      .setCustomId("rps")
      .setPlaceholder("* scared to move? *")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("*rock*")
          .setDescription("Its literrally a rock. Its rocky.\nWHAT MORE DO YOU WANT TO KNOW????\n\n please release me..")
          .setValue("rock"),
        new StringSelectMenuOptionBuilder()
          .setLabel("*paper*")
          .setDescription("Burns well. If you needed that.")
          .setValue("paper"),
        new StringSelectMenuOptionBuilder()
          .setLabel("*scissors*")
          .setDescription("Good to cut paper.\n WARNING: DON'T USE ON ROCK")
          .setValue("scissors")
      );

    const row = new ActionRowBuilder().addComponents(rps_combo);

    await interaction.reply({
      content: "Choose your move wisely, shitlord...",
      components: [row],
    });
  },
};

export async function handleRPSInteraction(interaction) {
  const our_option = options[Math.floor(Math.random() * 3)];
  const their_option = interaction.values[0];
  //console.log( "OUR OPTION: " + our_option + ", THEIR OPTION: " + their_option)
  const user = userMention(interaction.user.id);
  if (our_option == their_option) {
    interaction.reply(
      "We're on the same wavelength! The winner wavelength!\nToo bad, " + user + ". We both used " + our_option + "."
    );
    //WINS
  } else if (our_option === "rock" && their_option === "scissors") {
        interaction.reply(
            " " + user + " used " + their_option + 
            ", but couldn\'t cut through my will of " + our_option +
            "\nI win bigtime! You loser!"
        );
  } else if (our_option === "scissors" && their_option === "paper") {
      interaction.reply(
          " " + user + " used " + their_option + 
          ", but I was the sharper of the two, considering I chose " + our_option + 
          ".\nI win! You lose! Eat shit!"
      );
    //LOSSES
  } else if (
    (their_option === "rock" && our_option === "scissors") || (their_option === "scissors" && our_option === "paper")
  ) {
    if (Math.floor(Math.random() * 2) == 1) {
      interaction.reply(
        " " + user + " used " + their_option +
        ", and, well, I chose " + our_option + ". Shit.\nI guess  " + user + " wins."
      );
    } else {
      interaction.reply(
        " " + user + " used " + their_option +
        ", but I...\nIt's not cheating if I say that I won anyways, right?\nWell,  " +
        user + " wins then, I guess."
      );
    }
  }
}

const options = ["rock", "paper", "scissors"];
