const Discord = require('discord.js')
const admin = require('firebase-admin');
const request = require('request');
const fs = require('fs');
module.exports = {
	name: 'updatefile',
	description: 'Updates a product file and sends out a mass DM with the new file.',
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
                .setTitle('**Update File Information**')
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
                .setTitle('**Update File Information**')
                .addField('Status', ':x: **Cancelled!**', true)
                .addField('Error', 'Product ID invalid.', true)
                .setThumbnail(guild.iconURL())
            await message.channel.send(ThisEmbed)
            return
        }
        if (!message.attachments.first()) {
            let Loading = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Update File Information**')
                .addField('Status', ':hourglass_flowing_sand: **Waiting for File...**', true)
                .addField('Task', 'Please Attach the file you would like to use.', true)
                .setThumbnail(guild.iconURL())
            let m = await message.channel.send(Loading)
            var ret = false
            let fileMessage = (await message.channel.awaitMessages(m => m.author.id == message.author.id, { max: 1, time: 300000, error: ['time'] }).catch( err => { ret = true })).first()
            if (!fileMessage || ret == true) {
                let ThisEmbed = new Discord.MessageEmbed()
                    .setColor(Number(process.env.BOT_EMBEDCOLOR))
                    .setAuthor(message.author.username, message.author.displayAvatarURL())
                    .setTitle('**Update File Information**')
                    .addField('Status', ':x: **Cancelled!**', true)
                    .addField('Error', 'No response.', true)
                    .setThumbnail(guild.iconURL())
                await m.edit(ThisEmbed)
                return
            }
            if (!fileMessage.attachments.first()) {
                let ThisEmbed = new Discord.MessageEmbed()
                    .setColor(Number(process.env.BOT_EMBEDCOLOR))
                    .setAuthor(message.author.username, message.author.displayAvatarURL())
                    .setTitle('**Update File Information**')
                    .addField('Status', ':x: **Cancelled!**', true)
                    .addField('Error', 'No file found.', true)
                    .setThumbnail(guild.iconURL())
                await m.edit(ThisEmbed)
                return
            }
            let index = args.shift()
            let name = args.join(' ')
            let ext = fileMessage.attachments.first().url.split('.')
            fs.unlinkSync(product.data().path)
            request.get(fileMessage.attachments.first().url)
                .on('error', console.error)
                .pipe(fs.createWriteStream('product-files/'+index+'.'+ext[ext.length - 1]));
            await database.collection('products').doc(index).update({ path: 'product-files/'+index+'.'+ext[ext.length - 1] })
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Update File Information**')
                .addField('Status', ':hourglass_flowing_sand: **Releasing update in DMs...**', true)
                .setThumbnail(guild.iconURL())
            await m.edit(ThisEmbed)
            var usersSent = 0
            var usersTotal = 0
            let users = await database.collection('users').get()
            async function asyncForEach(array, callback) {
                for (let index = 0; index < array.length; index++) {
                    await callback(array[index], index, array);
                }
            }
            await asyncForEach(users.docs, async (user) => {
                if (user.data().products.find(r => r == index) && user.data().verify.status == 'complete') {
                    let member = guild.members.cache.find(m => m.user.id == user.data().verify.value)
                    if (member) {
                        let ThisEmbed = new Discord.MessageEmbed()
                            .setColor(Number(process.env.BOT_EMBEDCOLOR))
                            .setAuthor(message.author.username, message.author.displayAvatarURL())
                            .setTitle('**Product Updated**')
                            .setDescription(`The following product is a new update of: **${product.name}**`)
                            .setThumbnail(guild.iconURL())
                        usersTotal++
                        await member.send(ThisEmbed).catch(err => {})
                        let sent = await bot.functions.sendFile(member, index)
                        if (sent) usersSent++
                    }
                }
            })
            let NextEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Update File Information**')
                .addField('Status', ':white_check_mark: **Complete!** `'+usersSent+'/'+usersTotal+'` received.', true)
                .addField('Product Information', 'ID: \`'+index+'\`\nName: \`'+product.data().name+'\`\nFile: \`'+index+'.'+ext[ext.length - 1]+'\`', true)
                .setThumbnail(guild.iconURL())
            await m.edit(NextEmbed)
        } else {
            let index = args.shift()
            let name = args.join(' ')
            let ext = message.attachments.first().url.split('.')
            fs.unlinkSync(product.data().path)
            request.get(message.attachments.first().url)
                .on('error', console.error)
                .pipe(fs.createWriteStream('product-files/'+index+'.'+ext[ext.length - 1]));
            await database.collection('products').doc(index).update({ path: 'product-files/'+index+'.'+ext[ext.length - 1] })
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Update File Information**')
                .addField('Status', ':hourglass_flowing_sand: **Releasing update in DMs...**', true)
                .setThumbnail(guild.iconURL())
            let response = await message.channel.send(ThisEmbed)
            var usersSent = 0
            var usersTotal = 0
            let users = await database.collection('users').get()
            async function asyncForEach(array, callback) {
                for (let index = 0; index < array.length; index++) {
                    await callback(array[index], index, array);
                }
            }
            await asyncForEach(users.docs, async (user) => {
                if (user.data().products.find(r => r == index) && user.data().verify.status == 'complete') {
                    let member = guild.members.cache.find(m => m.user.id == user.data().verify.value)
                    if (member) {
                        let ThisEmbed = new Discord.MessageEmbed()
                            .setColor(Number(process.env.BOT_EMBEDCOLOR))
                            .setAuthor(message.author.username, message.author.displayAvatarURL())
                            .setTitle('**Product Updated**')
                            .setDescription(`The following product is a new update of: **${index}**`)
                            .setThumbnail(guild.iconURL())
                        usersTotal++
                        await member.send(ThisEmbed).catch(err => {})
                        let sent = await bot.functions.sendFile(member, index)
                        if (sent) usersSent++
                    }
                }
            })
            let NextEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Update File Information**')
                .addField('Status', ':white_check_mark: **Complete!** `'+usersSent+'/'+usersTotal+'` received.', true)
                .addField('Product Information', 'ID: \`'+index+'\`\nName: \`'+product.data().name+'\`\nFile: \`'+index+'.'+ext[ext.length - 1]+'\`', true)
                .setThumbnail(guild.iconURL())
            await response.edit(NextEmbed)
        }
	}
};