const Discord = require('discord.js')
const admin = require('firebase-admin');
const fs = require('fs');
module.exports = {
	name: 'delete',
	description: 'Deletes a product with it\s file.',
	arguments: [
        {
            label: "Product ID"
        }
    ],
    guildOnly: true,
    userPermissions: [
        'MANAGE_GUILD'
    ],
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
                .setTitle('**Delete Information**')
                .addField('Status', ':x: **Cancelled!**', true)
                .addField('Error', 'Incorrect arguments.', true)
                .setThumbnail(guild.iconURL())
            await message.channel.send(ThisEmbed)
            return
        }
        let product = await database.collection('products').doc(args[0]).get()
        if (!product.exists) {
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Delete Information**')
                .addField('Status', ':x: **Cancelled!**', true)
                .addField('Error', 'Product ID not found.', true)
                .setThumbnail(guild.iconURL())
            await message.channel.send(ThisEmbed)
            return
        }
        let path = product.path;
        let users = await database.collection('users').get()
        if (!users.empty) {
            let formatted = users.docs
            let me = formatted.filter(v => v.data().products.find(r => r == args[0]))
            me.forEach(async (auser) => {
                let index = auser.id
                let user = auser.data()
                user.products.splice(user.products.indexOf(args[0]), 1)
                await database.collection('users').doc(index).update({products: user.products})
            })
        }
        await database.collection('products').doc(args[0]).delete()
        fs.unlinkSync(path)
        let ThisEmbed = new Discord.MessageEmbed()
            .setColor(Number(process.env.BOT_EMBEDCOLOR))
            .setAuthor(message.author.username, message.author.displayAvatarURL())
            .setTitle('**Delete Information**')
            .addField('Status', ':white_check_mark: **Complete!**', true)
            .setThumbnail(guild.iconURL())
        await message.channel.send(ThisEmbed)
	}
};