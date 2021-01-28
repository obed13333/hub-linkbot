const Discord = require('discord.js')
const admin = require('firebase-admin');
const fs = require('fs');
module.exports = {
	name: 'retrieve',
	description: 'Fetches a product file.',
	arguments: [
        {
            label: "Product ID"
        }
    ],
    guildOnly: true,
    userPermissions: [],
    clientPermissions: [
        'SEND_MESSAGES'
    ],
    cooldown: 5,
	run: async (bot, message, args) => {
        let database = admin.firestore();
        let guild = bot.guilds.cache.get(process.env.BOT_PRIMARYGUILD)
        if (args.length !== 1) {
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Retrieve Information**')
                .addField('Status', ':x: **Cancelled!**', true)
                .addField('Error', 'Incorrect arguments.', true)
                .setThumbnail(guild.iconURL())
            await message.channel.send(ThisEmbed)
            return
        }
        if (!(await database.collection('products').doc(args[0]).get()).exists) {
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Retrieve Information**')
                .addField('Status', ':x: **Cancelled!**', true)
                .addField('Error', 'Product ID not found.', true)
                .setThumbnail(guild.iconURL())
            await message.channel.send(ThisEmbed)
            return
        }
        let users = await database.collection('users').get()
        if (users.empty) {
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Retrieve Information**')
                .addField('Status', ':x: **Cancelled!**', true)
                .addField('Error', 'Does not own product.', true)
                .setThumbnail(guild.iconURL())
            await message.channel.send(ThisEmbed)
            return
        }
        let formatted = users.docs
        let me = formatted.find(v => {if (v.data().verify.status == "complete") {return v.data().verify.value == message.author.id} else {return false}})
        if (!me || !me.data().products.find(p => p == args[0])) {
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Retrieve Information**')
                .addField('Status', ':x: **Cancelled!**', true)
                .addField('Error', 'Does not own product.', true)
                .setThumbnail(guild.iconURL())
            await message.channel.send(ThisEmbed)
            return
        }
        let sent = await bot.functions.sendFile(message.member, args[0])
        let ThisEmbed = new Discord.MessageEmbed()
            .setColor(Number(process.env.BOT_EMBEDCOLOR))
            .setAuthor(message.author.username, message.author.displayAvatarURL())
            .setTitle('**Retrieve Information**')
            .setThumbnail(guild.iconURL())
        if (sent) {
            ThisEmbed.addField('Status', ':white_check_mark: **Complete!**', true)
            ThisEmbed.addField('Task', 'Please check your DMs.', true)
        } else {
            ThisEmbed.addField('Status', ':x: **Incomplete!**', true)
            ThisEmbed.addField('Task', 'Please open your Direct Messages and try again.', true)
        }
        await message.channel.send(ThisEmbed)
	}
};
