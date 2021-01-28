const Discord = require('discord.js')
const editJsonFile = require('edit-json-file');
module.exports = {
	name: 'transfer',
	description: 'Transfers product access from one user to another.',
	arguments: [
        {
            label: 'From User'
        },
        {
            label: 'To User'
        },
        {
            label: 'Product ID'
        }
    ],
    guildOnly: false,
    userPermissions: [
        'MANAGE_ROLES'
    ],
    clientPermissions: [
        'SEND_MESSAGES'
    ],
    cooldown: 20,
	run: async (bot, message, args) => {
        let database = admin.firestore();
        let users = await database.collection('users').get()
        let guild = bot.guilds.cache.get(process.env.BOT_PRIMARYGUILD)
        if (args.length !== 3) {
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Whitelist Information**')
                .addField('Status', ':x: **Cancelled!**', true)
                .addField('Error', 'Incorrect arguments.', true)
                .setThumbnail(guild.iconURL())
            await message.channel.send(ThisEmbed)
            return
        }
        if (!(await database.collection('products').doc(args[2]).get()).exists) {
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Whitelist Information**')
                .addField('Status', ':x: **Cancelled!**', true)
                .addField('Error', 'Product ID not found.', true)
                .setThumbnail(guild.iconURL())
            await message.channel.send(ThisEmbed)
            return
        }
        async function getMember(message, info, guild) {
            await guild.members.fetch()
            if (!info) return 
            var target;
            target = guild.members.cache.get(info);
            if (target) return target;
            target = guild.members.cache.find(u => {if (message.mentions.users.first()) return u.user.id == message.mentions.users.first().id; else return false});
            if (target) return target;
            target = guild.members.cache.find(u => u.user.id == info);
            if (target) return target;
            target = guild.members.cache.find(u => u.user.tag.includes(info));
            if (target) return target;
            target = guild.members.cache.find(u => u.displayName.includes(info));
            if (target) return target;
            return
        }
        let frommember = await getMember(message, args[0], guild)
        let tomember = await getMember(message, args[1], guild)
        if (!users.empty) {
            let entries = users.docs
            var set = entries.find(u => {if (u.data().verify.status == 'complete') {return u.id == args[0]} else {return false}})
            if (!set) set = entries.find(u => {if (u.data().verify.status == 'complete') {return u.data().robloxId == args[0]} else {return false}})
            if (!set && frommember) set = entries.find(u => {if (u.data().verify.status == 'complete') {return u.data().verify.value == frommember.user.id} else {return false}})
            var toset = entries.find(u => {if (u.data().verify.status == 'complete') {return u.id == args[1]} else {return false}})
            if (!toset) toset = entries.find(u => {if (u.data().verify.status == 'complete') {return u.data().robloxId == args[1]} else {return false}})
            if (!toset && tomember) toset = entries.find(u => {if (u.data().verify.status == 'complete') {return u.data().verify.value == tomember.user.id} else {return false}})
            if (set && toset) {
                if (set.data().products.find(r => r == args[2]) && !toset.data().products.find(r => r == args[2])) {
                    await bot.functions.revokeProduct(guild.members.cache.find(m => m.user.id == frommember.user.id), args[2])
                    let sent = await bot.functions.giveProduct(guild.members.cache.find(m => m.user.id == tomember.user.id), args[2])
                    let ThisEmbed = new Discord.MessageEmbed()
                        .setColor(Number(process.env.BOT_EMBEDCOLOR))
                        .setAuthor(message.author.username, message.author.displayAvatarURL())
                        .setTitle('**Whitelist Information**')
                        .addField('Status', ':white_check_mark: **Complete!**', true)
                        .addField('Gave Product', args[2], true)
                        .addField('From User', set[1].robloxUsername, true)
                        .addField('To User', toset[1].robloxUsername, true)
                        .addField('DM Success', sent, true)
                        .setThumbnail(guild.iconURL())
                    await message.channel.send(ThisEmbed)
                    return
                } else {
                    let ThisEmbed = new Discord.MessageEmbed()
                        .setColor(Number(process.env.BOT_EMBEDCOLOR))
                        .setAuthor(message.author.username, message.author.displayAvatarURL())
                        .setTitle('**Whitelist Information**')
                        .addField('Status', ':x: **Incomplete!**', true)
                        .addField('Error', 'Product Ownership does not match.', true)
                        .setThumbnail(guild.iconURL())
                    await message.channel.send(ThisEmbed)
                    return
                }
            } else if (!toset.exists) {
                let ThisEmbed = new Discord.MessageEmbed()
                    .setColor(Number(process.env.BOT_EMBEDCOLOR))
                    .setAuthor(message.author.username, message.author.displayAvatarURL())
                    .setTitle('**Whitelist Information**')
                    .addField('Status', ':x: **Incomplete!**', true)
                    .addField('Error', 'To User not found.', true)
                    .setThumbnail(guild.iconURL())
                await message.channel.send(ThisEmbed)
                return
            } else if (!set.exists) {
                let ThisEmbed = new Discord.MessageEmbed()
                    .setColor(Number(process.env.BOT_EMBEDCOLOR))
                    .setAuthor(message.author.username, message.author.displayAvatarURL())
                    .setTitle('**Whitelist Information**')
                    .addField('Status', ':x: **Incomplete!**', true)
                    .addField('Error', 'From User not found.', true)
                    .setThumbnail(guild.iconURL())
                await message.channel.send(ThisEmbed)
                return
            }
        } 
        let ThisEmbed = new Discord.MessageEmbed()
            .setColor(Number(process.env.BOT_EMBEDCOLOR))
            .setAuthor(message.author.username, message.author.displayAvatarURL())
            .setTitle('**Whitelist Information**')
            .addField('Status', ':x: **Incomplete!**', true)
            .addField('Error', 'Both users not found.', true)
            .setThumbnail(guild.iconURL())
        await message.channel.send(ThisEmbed)
	}
};