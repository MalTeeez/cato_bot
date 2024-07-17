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
import { ghostChannelMessage, ghostInteractionReply, later } from "../util/message.js";

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
    // Command doesn't work in dm's  
    if (interaction.guildId == null) {
      ghostInteractionReply(interaction, "this command only works in servers, idiot..", 15);
      return;
    }

    if (interaction.options.getSubcommand() === "start") {
      let channel = interaction.options.getChannel("channel");
      let url = interaction.options.getString("link")
        .match(/(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|playlist\?|watch\?v=|watch\?.+(?:&|&#38;);v=))([a-zA-Z0-9\-_]{11})/);
      // Try to get previous connection
      let connection = getVoiceConnection(interaction.guild.id);
      const own_channel = interaction.guild.members.me.voice.channel;

      if (!url) {
        // Provided link is not valid
        ghostInteractionReply(interaction, "**given link is not valid**. idiot. *maybe it wasn't a single video..*", 5)
        return;
      } else {
        // Shorten the url
        url = "https://youtu.be/" + url[1];
      }

      if (channel && !channel.isVoiceBased()) {
        // Provided channel is not voice
        ghostInteractionReply(interaction, "**provided channel is not a voice channel..**. idiot", 5)
        return;
      }

      if (!connection && channel) {
        // There is no connection and a channel was provided
        ghostInteractionReply(interaction, "**joining vc..**.", 5)
      }

      if (!connection && !channel) {
        const source_member_voice = interaction.member.voice;
        if (source_member_voice && source_member_voice.channel) {
          // There is no connection and no channel was provided, but the source user is in a voice channel
          channel = source_member_voice.channel;
          ghostInteractionReply(interaction, "*joining your vc..*.", 5)
        } else {
          // There is no connection and no channel was provided
          ghostInteractionReply(interaction, "it would be helpful to first know **where you want me** to make noise, you know..", 5)
          return;
        }
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
      console.log("encountered error on voice_connection_status.disconnected handler. ERR:")
      console.log(error);
      if (connection) {
        try {
          connection.destroy();
        } catch (e) {
          console.log("failed to destroy already disconnected client with still active connection. ERR:")
          console.log(e);
        }
      }
    }
  });

  await new Promise(async (resolve, reject) => {
    let stream;
    try {
      // Get a Stream Readable from ytdl
      stream = getYoutubeResource(url);

      if (stream) {
        const source_user_mention = userMention(source_user.id);
        console.log(("[" + new Date(Date.now()).toISOString() + "] started playing " + url + " for " + source_user.displayName + "."))
        source_channel.send("\`\`oke, playing  ↓  for\`\` " + source_user_mention + ", \`\`im only doing this once, you hear me?.. \`\`\n              " + url)

        const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary, silencePaddingFrames: 10 });
        play_resource(connection, resource)
          .then(() => {
            resolve("[" + new Date(Date.now()).toISOString() + "] successfully finished playing resource.")
          })
          .catch((e) => {
            reject(e)
          });
      }
    } catch (e) {
      reject(e)
    }
  }).then((value) => {
    console.log(value)
  }).catch((error) => {
    console.log("failed while playing resource. ERR:");
    console.log(error);
    ghostChannelMessage(source_channel, "encountered error while trying to play video, that *clearly* was your mistake, huh?", 10)
  });
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
        console.log("encountered subscription without subscribed player, something is off.")
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
      console.log("player is still in state " + player.state + ", waiting.");
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
      if (connection && connection.state == VoiceConnectionStatus.Ready) connection.destroy();
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
  try {
    if (ytdl.validateURL(yt_url)) {
      var stream = ytdl(yt_url, {
        filter: "audioonly",
        highWaterMark: 16384,
        dlChunkSize: 65536,
        quality: "highestaudio",
//        requestOptions: {              // SEE: config.json.example -> yt_cookie
//          headers: {
//            cookie: config.yt_cookie,
//          },
//        },
      });
      return stream;
    }
    return false;
  } catch (e) {
    throw e;
  }
}
