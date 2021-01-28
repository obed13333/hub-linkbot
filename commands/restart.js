const Discord = require('discord.js');
const fs = require('fs');
module.exports = {
	name: 'restart',
	description: 'Restarts the bot, updating all the code with it.',
	arguments: [],
    guildOnly: true,
    userPermissions: [
        'MANAGE_GUILD'
    ],
    clientPermissions: [],
    cooldown: 10,
	run: async (bot, message, args) => {
        let Loading = new Discord.MessageEmbed()
            .setColor(Number(process.env.BOT_EMBEDCOLOR))
            .setAuthor(message.author.username, message.author.displayAvatarURL())
            .setTitle('**Restart Information**')
            .addField('Restart Status', ':hourglass_flowing_sand: **Processing...**', true)
            .setThumbnail(message.guild.iconURL())
        let m = await message.channel.send(Loading)
        var restartData = {
            initialized: Date.now(),
            message: m.id,
            messageChannel: m.channel.id,
            author: {
                displayAvatarURL: message.author.displayAvatarURL(),
                username: message.author.username,
                guildIcon: message.guild.iconURL()
            }
        }
        fs.writeFileSync(`restart.json`, JSON.stringify(restartData))
        bot.destroy();
        bot.httpServer.close();
        console.log('PROCESS | Restarting...')
        process.exit(2)
    }
};