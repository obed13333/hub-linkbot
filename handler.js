/*
    HUB-LINKBOT (jdwoj5)
    Please view the README before getting started. (Please run node server.js when starting up the bot, not node handler.js.)
*/
require('dotenv').config();
const Discord = require('discord.js');
const fs = require('fs');
const express = require('express');
const axios = require('axios');
const requestIp = require('request-ip');
const rateLimit = require("express-rate-limit");
const rbx = require('noblox.js');
const admin = require('firebase-admin');
var http = require('http');
// var https = require('https');

// DATABASE HANDLING
var serviceAccount = require("./firebase.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
if (process.argv[2] !== '--restarted') console.info('FIREBASE | Online!');

// DISCORD CLIENT HANDLING
const intents = new Discord.Intents([ //  ADDITION COURTESY OF DarkMatterMatt ON GITHUB!
    Discord.Intents.NON_PRIVILEGED,
    "GUILD_MEMBERS",
]);
const bot = new Discord.Client({
    presence: {
        status: 'dnd',
        activity: {
            name: 'with some Products.',
            type: 'PLAYING'
        }
    },
    ws: { intents }
});
bot.logChannel = false;
bot.commands = new Discord.Collection();
bot.aliases = new Discord.Collection();
bot.cooldown = new Discord.Collection();
bot.functions = {};
bot.functions.sendFile = async (member, pid) => {
    var database = admin.firestore();
    let guild = bot.guilds.cache.get(process.env.BOT_PRIMARYGUILD)
    let products = await database.collection('products').doc(pid).get()
    let { name, path } = products.data();
    let ThisEmbed = new Discord.MessageEmbed()
        .setColor(Number(process.env.BOT_EMBEDCOLOR))
        .setAuthor(member.user.username, member.user.displayAvatarURL())
        .setTitle('**Product Received**')
        .addField('Product', name, true)
        .setThumbnail(guild.iconURL())
    var sent = true
    await member.send(ThisEmbed).catch(err => {
        sent = false
    })
    let file = new Discord.MessageAttachment(path, pid+'.'+path.split('.')[path.split('.').length - 1])
    await member.send(file).catch(err => {
        sent = false
    })
    return sent
};
bot.functions.updateMember = async (member) => {
    let guild = member.guild
    let roleResolved = guild.roles.cache.get(process.env.BOT_VERIFIEDROLEID)
    if (!guild.me.hasPermission('MANAGE_ROLES', true)) return false
    if (member.roles.highest.position >= guild.me.roles.highest.position) return false
    if (roleResolved.position >= guild.me.roles.highest.position) return false
    let database = admin.firestore();
    let users = await database.collection('users').get()
    if (users.empty) return false
    let format = users.docs
    let the = format.find(u => {if (u.data().verify.status == 'complete') {return u.data().verify.value == member.user.id} else {return false}})
    if (the) {
        var NotFound = false
        let robloxUser = await rbx.getPlayerInfo(the.data().robloxId)
            .catch(err => {if (err) {NotFound = true}})
        if (NotFound) return false
        if (the.data().robloxUsername || the.data().robloxUsername !== robloxUser.username) await database.collection('users').doc(the.id).update({robloxUsername: robloxUser.username})
        if (!member.roles.cache.get(process.env.BOT_VERIFIEDROLEID)) await member.roles.add(roleResolved); 
        return robloxUser.username
    }
    else {if (member.roles.cache.get(process.env.BOT_VERIFIEDROLEID)) await member.roles.remove(roleResolved); return false}
};
bot.functions.giveProduct = async (member, pid) => {
    let database = admin.firestore();
    let users = await database.collection('users').get()
    let format = users.docs
    let the = format.find(u => {if (u.data().verify.status == 'complete') {return u.data().verify.value == member.user.id} else {return false}})
    let index = the.id
    let user = the.data()
    user.products.push(pid)
    await database.collection('users').doc(index).update({products: user.products})
    return await bot.functions.sendFile(member, pid)
};
bot.functions.revokeProduct = async (uid, pid) => {
    let database = admin.firestore();
    let users = await database.collection('users').get()
    let format = users.docs
    let the = format.find(u => {if (u.data().verify.status == 'complete') {return u.data().verify.value == uid} else {return false}})
    if (!the) return false
    let index = the.id
    let user = the.data()
    user.products.splice(user.products.indexOf(pid), 1)
    await database.collection('users').doc(index).update({products: user.products})
    return true
};
for (const file of fs.readdirSync('./commands').filter(file => file.endsWith('.js'))) {
    const command = require(`./commands/${file}`);
    bot.commands.set(command.name, command);
    if (command.aliases) {
        for (const alias of command.aliases) {
            bot.aliases.set(alias, command);
        }
    }
}
bot.on('message', async (message) => {
    let guild = bot.guilds.cache.get(process.env.BOT_PRIMARYGUILD);
    if (message.author.bot) return
    if (!message.content.startsWith(process.env.BOT_PREFIX)) return
    const args = message.content.slice(process.env.BOT_PREFIX.length).split(/ +/);
	const index = args.shift().toLowerCase();
    var command = bot.commands.get(index)
    if (!command) command = bot.aliases.get(index)
    if (!command) return
    if (!message.guild) {
        let ThisEmbed = new Discord.MessageEmbed()
            .setColor(Number(process.env.BOT_EMBEDCOLOR))
            .setAuthor(message.author.username, message.author.displayAvatarURL())
            .setTitle('**Command is Guild Only**')
            .setDescription('Please run `'+process.env.BOT_PREFIX+index+args.map(a => ' '+a)+'` in the Discord Server.')
            .setThumbnail(guild.iconURL())
        await message.channel.send(ThisEmbed).then(m => m.delete({timeout: 3000}))
        return
    }
    if (message.guild) {
        let upermission = message.member.permissionsIn(message.channel)
        var matching = []
        for (permission of command.userPermissions) {
            if (!upermission.has(permission, true)) matching.push('`'+permission+'`')
        }
        if (matching.length > 0) {
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Permission denied**')
                .setDescription('You are missing the following permissions: '+matching.join(', '))
                .setThumbnail(message.guild.iconURL())
            await message.channel.send(ThisEmbed)
            return
        }
        let mepermission = message.guild.me.permissionsIn(message.channel)
        var matching = []
        for (permission of command.clientPermissions) {
            if (!mepermission.has(permission, true)) matching.push('`'+permission+'`')
        }
        if (matching.length > 0) {
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Insufficient Guild Permissions**')
                .setDescription('I am missing the following permissions: '+matching.join(', '))
                .setThumbnail(message.guild.iconURL())
            await message.channel.send(ThisEmbed)
            return
        }
    }
    if (command.cooldown) {
        let current = bot.cooldown.get(`${command.name}-${message.author.id}`)
        if (!isNaN(current) && current > 0) {
            let ThisEmbed = new Discord.MessageEmbed()
                .setColor(Number(process.env.BOT_EMBEDCOLOR))
                .setAuthor(message.author.username, message.author.displayAvatarURL())
                .setTitle('**Cooldown**')
                .setDescription('Please wait `'+current+'` seconds.')
                .setThumbnail(message.guild.iconURL())
            await message.channel.send(ThisEmbed).then(m => m.delete({timeout: 3000}))
            return
        } else {
            bot.cooldown.set(`${command.name}-${message.author.id}`, command.cooldown);
            let cooldown = setInterval(async () => {
                let thecurrent = bot.cooldown.get(`${command.name}-${message.author.id}`)
                if (thecurrent <= 0) {
                    bot.cooldown.set(`${command.name}-${message.author.id}`, 0);
                    clearInterval(cooldown)
                    return
                }
                bot.cooldown.set(`${command.name}-${message.author.id}`, thecurrent - 0.5);
            }, 500)
        }
    }
    await command.run(bot, message, args)
});
bot.on('guildMemberAdd', async (member) => {
    await bot.functions.updateMember(member)
})
bot.on('error', async (error) => {
    console.error(error)
})

// WEBAPP HANDLING
const app = express();
app.use(rateLimit({
    max: 120, // 120 requests max...
    windowMs: 1 * 60 * 1000, // ...for 1 minute
    handler: async (request, response) => {
        response.status(200);
        response.json({ status: 'error', error: 'Request limit reached.' })
    }
}));
app.use(async (request, response, next) => {
    if (!bot.user) {
        response.status(200)
        response.json({ status: 'error', error: 'Service unavailable.'})
    } else next()
});
app.get('/', async (request, response) => {
    response.status(200);
    response.json({ status: 'ok', running: true })
});
app.get('/user/:robloxid/', async (request, response) => {
    if (!request.query.key || request.query.key !== process.env.HUB_APIKEY) {
        response.status(200);
        response.json({ status: 'error', error: 'Unauthorized request.' })
        return
    }
    let database = admin.firestore();
    var NotFound = false
    let robloxUser = await rbx.getPlayerInfo(request.params.robloxid)
        .catch(err => {if (err) {NotFound = true}})
    if (robloxUser && NotFound == false) {
        let users = await database.collection('users').get()
        let entries = users.docs
        let set = entries.find(u => u.data().robloxId == request.params.robloxid)
        if (set) {
            let index = set.id
            let value = set.data()
            if (value.robloxUsername || value.robloxUsername !== robloxUser.username) await database.collection('users').doc(index).update({robloxUsername: robloxUser.username})
            response.status(200);
            response.json({ status: 'ok', index: index, value: value })
            return
        }
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
        let value = {
            robloxId: request.params.robloxid,
            robloxUsername: robloxUser.username,
            verify: {
                status: 'link',
                value: linkCode
            },
            products: []
        }
        let userDefined = await database.collection('users').add(value);
        response.status(200);
        response.json({ status: 'ok', index: userDefined.id, value: value })
    } else {
        response.status(200);
        response.json({ status: 'error', error: 'Not found.' })
    }
});
let leakedUsers = []
let leakedIps = []
let leakedGames = []
app.get('/game/:product/', async (request, response) => {
    let guild = bot.guilds.cache.get(process.env.BOT_PRIMARYGUILD);
    let database = admin.firestore();
    if (!request.headers["roblox-id"]) {
        response.status(200);
        response.json({ status: "error", error: "Not a ROBLOX Server.", message: "Stop snooping around this endpoint. >:(" });
        let ip = requestIp.getClientIp(request)
        if (!leakedIps.find(v => v == ip)) {
            if (ip && !leakedIps.find(v => v == ip)) {
                if (!bot.logChannel) console.log("WEB | User attempt to  GET /game/ denied. (Not a ROBLOX server.) IP: " + ip)
                let ThisEmbed = new Discord.MessageEmbed()
                    .setColor(Number(process.env.BOT_EMBEDCOLOR))
                    .setTitle('**Leak Information**')
                    .addField('Action', '**User attempted to GET /game/ (Contact with a non-ROBLOX server.)**', true)
                    .addField('IP', ip, true)
                    .setThumbnail(guild.iconURL())
                if (bot.logChannel) bot.logChannel.send(ThisEmbed).catch(err => {console.log("WEB | User attempt to  GET /game/ denied. (Not a ROBLOX server.) IP: " + ip)})
                leakedIps.push(ip)
            }
            else console.log("WEB | User attempt to  GET /game/ denied. (Not a ROBLOX server.) IP not found!")
        }
        return;
    }
    if (!request.query.job) {
        response.status(200);
        response.json({
            status: "error",
            error: "Products do not work in Studio."
        });
        return;
    }
    if (!request.params.product || !(await database.collection('products').doc(request.params.product).get()).exists) {
        response.status(200);
        response.json({
            status: "error",
            error: "Product not found."
        });
        return;
    }
    var returning = false
    let PlaceReq = await axios.get(
        "https://api.roblox.com/marketplace/productinfo?assetId=" + request.headers["roblox-id"]
    ).catch(err => {returning = true})
    if (returning) {
        response.status(200);
        response.json({ status: "error", error: "Not a ROBLOX Server.", message: "Stop snooping around this endpoint. >:(" });
        let ip = requestIp.getClientIp(request)
        if (!leakedIps.find(v => v == ip)) {
            if (ip && !leakedIps.find(v => v == ip)) {
                if (!bot.logChannel) console.log("WEB | User attempt to  GET /game/ denied. (Not a ROBLOX server.) IP: " + ip)
                let ThisEmbed = new Discord.MessageEmbed()
                    .setColor(Number(process.env.BOT_EMBEDCOLOR))
                    .setTitle('**Leak Information**')
                    .addField('Action', '**User attempted to GET /game/ (Contact with a non-ROBLOX server.)**', true)
                    .addField('IP', ip, true)
                    .setThumbnail(guild.iconURL())
                if (bot.logChannel) bot.logChannel.send(ThisEmbed).catch(err => {console.log("WEB | User attempt to  GET /game/ denied. (Not a ROBLOX server.) IP: " + ip)})
                leakedIps.push(ip)
            }
            else console.log("WEB | User attempt to  GET /game/ denied. (Not a ROBLOX server.) IP not found!")
        }
        return;
    }
    let PlaceInfo = PlaceReq.data
    var CreatorId = PlaceInfo.Creator.CreatorTargetId;
    var CreatorName = PlaceInfo.Creator.Name;
    if (PlaceInfo.Creator.CreatorType == "Group") {
        let GroupInfo = (await axios.get(
            "https://groups.roblox.com/v1/groups/" + CreatorId
        )).data;
        CreatorName = GroupInfo.owner.username;
        CreatorId = GroupInfo.owner.userId;
    }
    let users = await database.collection('users').get()
    if (!users.empty) {
        let entries = users.docs
        let set = entries.find(u => u.data().robloxId == CreatorId)
        if (set) {
            let index = set.id
            let value = set.data()
            let owned = value.products.find(v => v == request.params.product) != null
            if (!owned && (!leakedGames.find(v => v == request.headers["roblox-id"]) || !leakedUsers.find(v => v == CreatorId))) {
                if (!leakedGames.find(v => v == request.headers["roblox-id"])) leakedGames.push(request.headers["roblox-id"])
                if (!leakedUsers.find(v => v == CreatorId)) leakedUsers.push(CreatorId)
                if (!bot.logChannel) console.log("WEB | User attempted to use a product that they didn't own. UserID: " + CreatorId + " | PlaceID: " + request.headers["roblox-id"])
                let ThisEmbed = new Discord.MessageEmbed()
                    .setColor(Number(process.env.BOT_EMBEDCOLOR))
                    .setTitle('**Leak Information**')
                    .addField('Action', '**User attempted to use a product that they didn\'t own.**', true)
                    .addField('ROBLOX', '**Username:** `'+CreatorName+'`\n**ID:** `'+CreatorId+'`\n**Link:** [Click Here](https://www.roblox.com/games/'+CreatorId+'/)', true)
                    .addField('Game', '**Name:** `'+PlaceInfo.Name+'`\n**ID:** `'+request.headers["roblox-id"]+'`\n**Link:** [Click Here](https://www.roblox.com/games/'+request.headers["roblox-id"]+')', true)
                    .addField('Discord', '**Member:** <@'+value.verify.value+'>\n**ID:** `'+value.verify.value+'`', true)
                    .setThumbnail(guild.iconURL())
                if (bot.users.cache.get(value.verify.value)) ThisEmbed.setAuthor(bot.users.cache.get(value.verify.value).username, bot.users.cache.get(value.verify.value).displayAvatarURL())
                if (bot.logChannel) bot.logChannel.send(ThisEmbed).catch(err => {console.log("WEB | User attempted to use a product that they didn't own. UserID: " + CreatorId + " | PlaceID: " + request.headers["roblox-id"])})
            }
            response.status(200);
            response.json({ 
                status: "ok",
                place: {
                    CreatorType: PlaceInfo.Creator.CreatorType,
                    CreatorId: PlaceInfo.Creator.CreatorTargetId,
                    WhitelistOwner: CreatorId,
                    OwnerUUID: index
                },
                owned: owned
            })
            return
        }
    }
    response.status(200);
    response.json({ status: 'error', error: 'Not found.' })
    if (!leakedGames.find(v => v == request.headers["roblox-id"])) leakedGames.push(request.headers["roblox-id"])
    if (!leakedUsers.find(v => v == CreatorId)) leakedUsers.push(CreatorId)
    if (!bot.logChannel) console.log("WEB | User attempted to use a product that they didn't own. UserID: " + CreatorId + " | PlaceID: " + request.headers["roblox-id"])
    let ThisEmbed = new Discord.MessageEmbed()
        .setColor(Number(process.env.BOT_EMBEDCOLOR))
        .setTitle('**Leak Information**')
        .addField('Action', '**User attempted to use a product that they didn\'t own.**', true)
        .addField('ROBLOX', '**Username:** `'+CreatorName+'`\n**ID:** `'+CreatorId+'`\n**Link:** [Click Here](https://www.roblox.com/games/'+CreatorId+'/)', true)
        .addField('Game', '**Name:** `'+PlaceInfo.Name+'`\n**ID:** `'+request.headers["roblox-id"]+'`\n**Link:** [Click Here](https://www.roblox.com/games/'+request.headers["roblox-id"]+')', true)
        .setThumbnail(guild.iconURL())
    if (bot.logChannel) bot.logChannel.send(ThisEmbed).catch(err => {console.log("WEB | User attempted to use a product that they didn't own. UserID: " + CreatorId + " | PlaceID: " + request.headers["roblox-id"])})
    return
});
app.get('/products/', async (request, response) => {
    if (!request.query.key || request.query.key !== process.env.HUB_APIKEY) {
        response.status(200);
        response.json({ status: 'error', error: 'Unauthorized request.' });
        return
    }
    let database = admin.firestore();
    let products = new Object();
    let dbProducts = await database.collection('products').get()
    dbProducts.forEach((product) => {
        products[product.id] = product.data()
    })
    response.status(200);
    response.json({ status: 'ok', products: products })
});
app.get('/products/give/:productid/:robloxid/', async (request, response) => {
    if (!request.query.key || request.query.key !== process.env.HUB_APIKEY) {
        response.status(200);
        response.json({ status: 'error', error: 'Unauthorized request.' });
        return
    }
    let database = admin.firestore();
    if (!(await database.collection('products').doc(request.params.productid).get()).exists) {
        response.status(200);
        response.json({ status: 'error', error: 'Product not found.' });
        return
    }
    let users = await database.collection('users').get()
    if (!users.empty) {
        let formatted = users.docs
        let me = formatted.find(u => {if (u.data().verify.status == 'complete') {return u.data().robloxId == request.params.robloxid} else {return false}})
        if (!me) {
            response.status(200);
            response.json({ status: 'error', error: 'User not found.' });
            return
        }
        let user = me.data()
        if (user.products.find(r => r == request.params.productid)) {
            response.status(200);
            response.json({ status: 'error', error: 'Already owned.' });
            return
        }
        let guild = bot.guilds.cache.get(process.env.BOT_PRIMARYGUILD)
        let sent = await bot.functions.giveProduct(guild.members.cache.find(m => m.user.id == user.verify.value), request.params.productid)
        response.status(200);
        response.json({ status: 'ok', success: true, dm: sent })
    }
});
app.get('/products/revoke/:productid/:robloxid/', async (request, response) => {
    if (!request.query.key || request.query.key !== process.env.HUB_APIKEY) {
        response.status(200);
        response.json({ status: 'error', error: 'Unauthorized request.' });
        return
    }
    let database = admin.firestore();
    if (!(await database.collection('products').doc(request.params.productid).get()).exists) {
        response.status(200);
        response.json({ status: 'error', error: 'Product not found.' });
        return
    }
    let users = await database.collection('users').get()
    if (users) {
        let formatted = users.docs
        let me = formatted.find(u => {if (u.data().verify.status == 'complete') {return u.data().robloxId == request.params.robloxid} else {return false}})
        if (!me) {
            response.status(200);
            response.json({ status: 'error', error: 'User not found.' });
            return
        }
        let user = me.data()
        if (!user.products.find(r => r == request.params.productid)) {
            response.status(200);
            response.json({ status: 'error', error: 'Does not own product.' });
            return
        }
        let guild = bot.guilds.cache.get(process.env.BOT_PRIMARYGUILD)
        let success = await bot.functions.revokeProduct(user.verify.value, request.params.productid)
        response.status(200);
        response.json({ status: 'ok', success: success })
    }
});
app.use(async (request, response, next) => {
    response.status(200)
    response.json({ status: 'error', error: 'Path not found.'})
});

// PROCESS EXIT HANDLING
process.stdin.resume();
function exitHandler(options, exitCode) {
    if (bot.user) {
        bot.httpServer.close();
        bot.destroy();
    }
    process.exit();
}
process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

// FULL SYSTEM LOGIN
bot.on('ready', async () => {
    let guild = bot.guilds.cache.get(process.env.BOT_PRIMARYGUILD);
    if (!guild) {
        console.log('DISCORD | Not in Primary Guild! Crashing...')
        process.exit()
    }
    let verifiedRole = guild.roles.cache.get(process.env.BOT_VERIFIEDROLEID);
    if (!verifiedRole) {
        console.log('DISCORD | Verified Role not found! Crashing...')
        process.exit()
    }
    let logChannel = guild.channels.cache.get(process.env.BOT_LOGCHANNELID);
    if (!logChannel) {
        console.log('DISCORD | Log Channel not found! Will log in Console.')
    } else {
        bot.logChannel = logChannel
    }
    if (process.argv[2] !== '--restarted') console.info('DISCORD | Online!');
    
    // PROCESS RESTARTED HANDLING
    if (process.argv[2] == '--restarted') {
        fs.readFile('restart.json', 'utf8', async function (err, data) {
            if (err) console.log('PROCESS | Restarted, but no Restart Information was found!')
            else {
                let information = JSON.parse(data);
                let channel = await bot.channels.fetch(information.messageChannel)
                let msg = await channel.messages.fetch(information.message)
                let ThisEmbed = new Discord.MessageEmbed()
                    .setColor(Number(process.env.BOT_EMBEDCOLOR))
                    .setAuthor(information.author.username, information.author.displayAvatarURL)
                    .setTitle('**Restart Information**')
                    .addField('Restart Status', ':white_check_mark: **Complete!**', true)
                    .addField('Restart Time', (Date.now() - information.initialized) / 1000 + ' seconds', true)
                    .setThumbnail(information.author.guildIcon)
                await msg.edit(ThisEmbed)
                console.log('PROCESS | Restarted!')
                fs.unlinkSync('restart.json') 
            } 
        });
    }
    else {
        console.info('PROCESS | Started!')
        fs.readFile('restart.json', 'utf8', async function (err, data) {
            if (err) return
            else {
                let information = JSON.parse(data);
                let channel = await bot.channels.fetch(information.messageChannel)
                let msg = await channel.messages.fetch(information.message)
                let ThisEmbed = new Discord.MessageEmbed()
                    .setColor(Number(process.env.BOT_EMBEDCOLOR))
                    .setAuthor(information.author.username, information.author.displayAvatarURL)
                    .setTitle('**Restart Information**')
                    .addField('Restart Status', ':white_check_mark: **Manual restart complete!**', true)
                    .addField('Error Response Time', require('ms')(Date.now() - information.initialized), true)
                    .setThumbnail(information.author.guildIcon)
                await msg.edit(ThisEmbed)
                console.log('PROCESS | Corrected restart information!')
                fs.unlinkSync('restart.json') 
            } 
        });
    }
});

async function StartApp() {
    await bot.login(process.env.BOT_TOKEN);
    bot.httpServer = http.createServer(app).listen(process.env.PORT || process.env.HUB_ACCESSPORT || 8080)
}
StartApp()