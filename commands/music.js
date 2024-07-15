import { SlashCommandBuilder } from "@discordjs/builders";
import {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  NoSubscriberBehavior,
  createAudioResource,
  StreamType,
  entersState,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import ytdl from "@distube/ytdl-core";
import config from "../config.json" assert { type: "json" };

export default {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Play music")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Start playing audio from a youtube link. Yay!")
        .addChannelOption((option) => option.setName("channel").setDescription("Channel to join").setRequired(true))
        .addStringOption((option) => option.setName("link").setDescription("Youtube Link").setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("pause_or_resume").setDescription("Stop or continue playing the current audio source. aww, why?")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("dc").setDescription("Disconnect from the voice channel. bye... *later (╯°□°)╯︵ ┻━┻*")
    ),

  async execute(interaction) {
    if (interaction.options.getSubcommand() === "start") {
      const channel = interaction.options.getChannel("channel");
      const url = interaction.options.getString("link");
      // TODO: What if he is already playing?
      if (channel.isVoiceBased()) {
        connect_and_prepare(channel, url);
        await interaction.reply({ content: "joining vc...", ephemeral: true });
        await later(5000);
        await interaction.deleteReply();
      } else {
        await interaction.reply({ content: "provided channel is not a voice channel... idiot", ephemeral: true });
        await later(5000);
        await interaction.deleteReply();
      }
    } else if (interaction.options.getSubcommand() === "pause_or_resume") {
      const connection = getVoiceConnection(interaction.guild.id);
      if (connection) {
        const player = connection.state.subscription.player;
        if (player) {
          if (player.state.status === "paused" && player.playable) {
            player.unpause();
            await interaction.reply({
              content: "continuing playback of your awesome music (if its music (oh god I hope its music))",
              ephemeral: true,
            });
            await later(3000);
            await interaction.deleteReply();
          } else if (player.state.status === "playing") {
            player.pause();
            await interaction.reply({
              content: "paused playback of whatever your dumb ass was listening to..",
              ephemeral: true,
            });
            await later(3000);
            await interaction.deleteReply();
          } else {
            getVoiceConnection(interaction.guild.id).destroy();
            await interaction.reply({
              content: "something seems off with this voice session (player has unexpected state).. maybe come back later?",
              ephemeral: true,
            });
            await later(5000);
            await interaction.deleteReply();
          }
        } else {
          getVoiceConnection(interaction.guild.id).destroy();
          await interaction.reply({
            content: "something seems off with this voice session (player isnt player).. maybe come back later?",
            ephemeral: true,
          });
          await later(5000);
          await interaction.deleteReply();
        }
      } else {
        await interaction.reply({
          content: "i dont even seem to be connected yet, idiot",
          ephemeral: true,
        });
        await later(3000);
        await interaction.deleteReply();
      }
    } else if (interaction.options.getSubcommand() === "dc") {
      const connection = getVoiceConnection(interaction.guild.id);
      if (connection) {
        connection.destroy();
        await interaction.reply({ content: "leaving current vc, bye...\n see you later!", ephemeral: true });
        await later(5000);
        await interaction.deleteReply();
      } else {
        await interaction.reply({
          content: "i dont even seem to be connected yet, idiot",
          ephemeral: true,
        });
        await later(3000);
        await interaction.deleteReply();
      }
    }
  },
};

function later(delay) {
  return new Promise(function (resolve) {
    setTimeout(resolve, delay);
  });
}

export async function connect_and_prepare(channel, url) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
      // Seems to be reconnecting to a new channel - ignore disconnect
    } catch (error) {
      // Seems to be a real disconnect which SHOULDN'T be recovered from
      connection.destroy();
    }
  });

  const stream = getYoutubeResource(url);

  if (stream) {
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary, silencePaddingFrames: 10 });
    play_resource(connection, resource)
      .then(() => {
        console.log("Successfully played resource.");
      })
      .catch((e) => {
        console.log("Failed while playing resource. ERR:");
        console.log(e);
      });
  }
}

export async function play_resource(connection, resource) {
  await new Promise(async (resolve, reject) => {
    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });
    const subscription = connection.subscribe(player);
    while (!player.playable) {
      console.log("Player is still in state " + player.state + ", waiting.");
      await later(500);
    }
    player.play(resource);

    player.on("error", (error) => {
      player.stop();
      clearTimeout(timeout);
      subscription?.unsubscribe();
      reject(error);
    });

    const timeout = setTimeout(() => {
      player.stop();
      subscription?.unsubscribe();
      resolve();
    }, 3_600_000);

    resource.playStream.on("end", () => {
      clearTimeout(timeout);
      subscription?.unsubscribe();
      resolve();
    });
  });
}

function getYoutubeResource(yt_url) {
  if (ytdl.validateURL(yt_url)) {
    var stream = ytdl(yt_url, {
      filter: "audioonly",
      highWaterMark: 16384,
      dlChunkSize: 65536,
      quality: "highestaudio",
      requestOptions: {
        headers: {
          cookie: config.yt_cookie,
        },
      },
    });
    return stream;
  }
  return false;
}
