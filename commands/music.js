import { SlashCommandBuilder } from "@discordjs/builders";
import { userMention } from 'discord.js'
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
import { ghostInteractionReply, later } from "../util/message.js";

export default {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Play music")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Start playing audio from a youtube link. Yay!")
        .addStringOption((option) => option.setName("link").setDescription("Youtube Link").setRequired(true))
        .addChannelOption((option) => option.setName("channel").setDescription("Channel to join").setRequired(false))
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("pause_or_resume").setDescription("**stop or continue** playing the current audio source. aww, why?")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("dc").setDescription("**disconnect from the voice channel**. bye... *later (╯°□°)╯︵ ┻━┻*")
    ),

  async execute(interaction) {
    if (interaction.options.getSubcommand() === "start") {
      const channel = interaction.options.getChannel("channel");
      const url = interaction.options.getString("link");
      // Try to get previous connection
      let connection = getVoiceConnection(interaction.guild.id);
      const own_channel = interaction.guild.members.me.voice.channel;

      if (channel && !channel.isVoiceBased()) {
        // Provided channel is not voice
        ghostInteractionReply(interaction, "**provided channel is not a voice channel..**. idiot", 5)
        return;
      }

      if (!connection && !channel) {
        // There is no connection and no channel was provided
        ghostInteractionReply(interaction, "it would be helpful to first know **where you want me** to make noise, you know..", 5)
        return;
      }

      if (!connection && channel) {
        // There is no connection and a channel was provided
        ghostInteractionReply(interaction, "**joining vc..**.", 5)
      }

      if (channel && connection && own_channel && own_channel.id !== channel.id) {
        // Different channel
        const subscription = connection.state.subscription;
        if (subscription && subscription.player) {
          subscription.player.stop();
        }
        connection = null;
        ghostInteractionReply(interaction, "**switching channel..** to uhh, australia??", 3)
      }

      if (connection) {
        // Already connected, just want to change resource
        const subscription = connection.state.subscription;
        if (subscription && subscription.player) {
          subscription.player.stop();
        }
        ghostInteractionReply(interaction, "**changing tunes..** i hope you didn't interrupt a drop there", 3)
      }

      connect_and_prepare(channel, url, connection, interaction.channel, interaction.user);

    } else if (interaction.options.getSubcommand() === "pause_or_resume") {
      const connection = getVoiceConnection(interaction.guild.id);
      if (connection) {
        const player = connection.state.subscription.player;
        if (player) {
          if (player.state.status === "paused" && player.playable) {
            player.unpause();
            ghostInteractionReply(interaction, "continuing playback of your awesome music(if its music(oh god I hope its music))", 3)
          } else if (player.state.status === "playing") {
            player.pause();
            ghostInteractionReply(interaction, "paused playback of whatever your dumb ass was listening to..", 3)
          } else {
            getVoiceConnection(interaction.guild.id).destroy();
            ghostInteractionReply(interaction, "something seems off with this voice session (player has unexpected state).. maybe come back later?", 5)
          }
        } else {
          getVoiceConnection(interaction.guild.id).destroy();
          ghostInteractionReply(interaction, "something seems off with this voice session (player isn't player).. maybe come back later?", 5)
        }
      } else {
        ghostInteractionReply(interaction, "i dont even seem to be connected yet, idiot", 3)
      }

    } else if (interaction.options.getSubcommand() === "dc") {
      const connection = getVoiceConnection(interaction.guild.id);
      if (connection) {
        connection.destroy();
        ghostInteractionReply(interaction, "leaving current vc, bye...\n see you later!", 5)
      } else {
        ghostInteractionReply(interaction, "i dont even seem to be connected yet, idiot", 3)
      }
    }
  },
};

export async function connect_and_prepare(channel, url, connection, source_channel, source_user) {
  // Is the provided connection actually functional? If not, we create a new one
  if (!connection) {
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });
  }

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

  // Get a Stream Readable from ytdl
  const stream = getYoutubeResource(url);

  if (stream) {
    const source_user_mention = userMention(source_user.id);
    source_channel.send("\`\`oke, playing  ↓  for\`\` " + source_user_mention +", \`\`im only doing this once, you hear me?.. \`\`\n              " + url)

    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary, silencePaddingFrames: 10 });
    play_resource(connection, resource)
      .then(() => {
        console.log("Successfully finished playing resource.");
      })
      .catch((e) => {
        console.log("Failed while playing resource. ERR:");
        console.log(e);
      });
  }
}

export async function play_resource(connection, resource) {
  await new Promise(async (resolve, reject) => {
    let player;
    let subscription = connection.state.subscription;
    // Is there already a subscription on our connection?
    if (!subscription) {
      // No, there is not, so create one
      player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause,
        },
      });
      // And we need to subscribe it (freshly)
      subscription = connection.subscribe(player);
    } else {
      // Does this subscription already have a player?
      if (subscription.player) {
        // Yes, there is, so we can reuse it
        player = subscription.player;
      } else {
        console.log("Encountered subscription without subscribed player, something is off.")
        player = createAudioPlayer({
          behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
          },
        });
        subscription.unsubscribe();
        // And we need to subscribe it (again?)
        subscription = connection.subscribe(player);
      }
    }

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

    // Stop after an hour
    const timeout = setTimeout(() => {
      player.stop();
      subscription?.unsubscribe();
      connection.destroy();
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
