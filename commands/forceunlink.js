const Discord = require('discord.js')
const admin = require('firebase-admin');
module.exports = {
	name: 'forceunlink',
	description: 'Forcefully unlinks a selected Discord Account to your Registered User.',
	arguments: [
        {
            label: 'User'
        }
    ],
    guildOnly: false,
    userPermissions: [
        'MANAGE_ROLES'
    ],
    clientPermissions: [
        'SEND_MESSAGES'
    ],
    cooldown: 10,
	run: async (bot, message, args) => {
        if (!(args.length >= 1)) {
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Force Unlink Information**')
                .addField('Status', ':x: **Cancelled!**', true)
                .addField('Error', 'Incorrect arguments.', true)
                .setThumbnail(guild.iconURL())
            await message.channel.send(ThisEmbed)
            return
        }
        let database = admin.firestore();
        let users = await database.collection('users').get()
        let guild = bot.guilds.cache.get(process.env.BOT_PRIMARYGUILD)
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
        let member = await getMember(message, args.join(' '), guild)
        if (!users.empty) {
            let entries = users.docs
            var set = entries.find(u => {if (u.data().verify.status == 'complete') {return u.id == args.join(' ')} else {return false}})
            if (!set) set = entries.find(u => {if (u.data().verify.status == 'complete') {return u.data().robloxId == args.join(' ')} else {return false}})
            if (!set && member) set = entries.find(u => {if (u.data().verify.status == 'complete') {return u.data().verify.value == member.user.id} else {return false}})
            if (set) {
                let index = set.id
                let value = set.data()
                async function randomString(length, chars) {
                    var mask = '';
                    if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
                    if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    if (chars.indexOf('#') > -1) mask += '0123456789';
                    if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
                    var result = '';
                    for (var i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
                    var links = await database.collection('users').get()
                    if (links) if (links.docs.find(k => {if (k.data().verify.status == 'link') {return k.data().verify.value == result} else {return false}})) return await randomString(length, chars)
                    return result;
                }
                let linkCode = await randomString(6, 'a#');
                await database.collection('users').doc(index).update({verify: {status:'link',value:linkCode}})
                await bot.functions.updateMember(guild.members.cache.find(m => m.user.id == member.user.id))
                let ThisEmbed = new Discord.MessageEmbed()
                    .setColor(Number(process.env.BOT_EMBEDCOLOR))
                    .setAuthor(message.author.username, message.author.displayAvatarURL())
                    .setTitle('**Force Unlink Information**')
                    .addField('Status', ':white_check_mark: **Complete!**', true)
                    .addField('User Unlinked', value.robloxUsername, true)
                    .setThumbnail(guild.iconURL())
                await message.channel.send(ThisEmbed)
                return
            } else {
                let ThisEmbed = new Discord.MessageEmbed()
                    .setColor(Number(process.env.BOT_EMBEDCOLOR))
                    .setAuthor(message.author.username, message.author.displayAvatarURL())
                    .setTitle('**Force Unlink Information**')
                    .addField('Status', ':x: **Incomplete!**', true)
                    .addField('Error', 'User not found.', true)
                    .setThumbnail(guild.iconURL())
                await message.channel.send(ThisEmbed)
                return
            }
        } 
        let ThisEmbed = new Discord.MessageEmbed()
            .setColor(Number(process.env.BOT_EMBEDCOLOR))
            .setAuthor(message.author.username, message.author.displayAvatarURL())
            .setTitle('**Force Unlink Information**')
            .addField('Status', ':x: **Incomplete!**', true)
            .addField('Error', 'User not found.', true)
            .setThumbnail(guild.iconURL())
        await message.channel.send(ThisEmbed)
	}
};
