const Discord = require('discord.js')
const editJsonFile = require('edit-json-file');
module.exports = {
	name: 'profile',
	description: 'Displays all information stored about a user.',
	arguments: [
        {
            label: 'User'
        }
    ],
    guildOnly: false,
    userPermissions: [],
    clientPermissions: [
        'SEND_MESSAGES'
    ],
    cooldown: 5,
	run: async (bot, message, args) => {
        let database = admin.firestore();
        let users = await database.collection('users').get()
        let guild = bot.guilds.cache.get(process.env.BOT_PRIMARYGUILD)
        async function getMember(message, info, guild) {
            await guild.members.fetch()
            if (!info) return guild.members.cache.find(u => u.user.id == message.author.id);
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
            return guild.members.cache.find(u => u.user.id == message.author.id);
        }
        let member = await getMember(message, args.join(' '), guild)
        if (!users.empty) {
            let entries = users.docs
            var set = entries.find(u => {if (u.data().verify.status == 'complete') {return u.id == args.join(' ')} else {return false}})
            if (!set) set = entries.find(u => {if (u.data().verify.status == 'complete') {return u.data().robloxId == args.join(' ')} else {return false}})
            if (!set) set = entries.find(u => {if (u.data().verify.status == 'complete') {return u.data().verify.value == member.user.id} else {return false}})
            if (set) {
                await bot.functions.updateMember(message.member)
                let index = set.id
                let value = set.data()
                let finalProduct = [];
                let products = await database.collection('products').get()
                value.products.forEach((v)=>{let product=products.docs.find(p => p.id == v);if(product)finalProduct.push(`**${product.data().name}** \`${v}\``)})
                let ThisEmbed = new Discord.MessageEmbed()
                    .setColor(Number(process.env.BOT_EMBEDCOLOR))
                    .setAuthor(message.author.username, message.author.displayAvatarURL())
                    .setTitle('**Profile Information**')
                    .addField('ROBLOX', `Username: \`${value.robloxUsername}\`\nID: \`${value.robloxId}\``, true)
                    .addField('Discord', `ID: \`${value.verify.value}\``, true)
                    .setThumbnail(guild.iconURL())
                if (finalProduct.length > 0) ThisEmbed.addField('Products',  finalProduct.join('\n'), true)
                await message.channel.send(ThisEmbed)
                return
            }
        } 
        let ThisEmbed = new Discord.MessageEmbed()
            .setColor(Number(process.env.BOT_EMBEDCOLOR))
            .setAuthor(message.author.username, message.author.displayAvatarURL())
            .setTitle('**Profile Information**')
            .addField('Error', ':x: **Not found!**')
            .setThumbnail(message.guild.iconURL())
        await message.channel.send(ThisEmbed)
	}
};
