
/**
 * Reply to an interaction ephemerally, and delete that reply within x seconds
 * @param {ChatInputCommandInteraction} interaction The interaction to reply to
 * @param {string} text The text to print
 * @param {*} delay The delay to wait in seconds 
 */
export async function ghostInteractionReply(interaction, text, delay) {
    await interaction.reply({
        content: text,
        ephemeral: true,
    });
    await later(delay * 1000);
    await interaction.deleteReply();
}

/**
 * Wait for x milliseconds (don't forget to await func)
 * @param {Integer} delay Milliseconds to wait 
 * @returns A promise which resolves after x millis (needs to be awaited)
 */
export function later(delay) {
    return new Promise(function (resolve) {
        setTimeout(resolve, delay);
    });
}