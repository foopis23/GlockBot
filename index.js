const Discord = require('discord.js');
const client = new Discord.Client();
const parser  = require('discord-command-parser');
const Database = require("./db/Database");
const fs = require('fs');
const table = require('text-table');
require('dotenv-defaults').config()

const PREFIX  = '?';
const GLOCKS = [
    "🔫"
];
const KILL_PHRASE = [
    "kill me"
];
const SCORE_TIMER = 10000;
const BACKFIRE_KILLS = 2;
const COMMAND_INFO = JSON.parse(fs.readFileSync("commands-info.json"));

var database = new Database();

function isGlock(msg)
{
    for(let i=0; i < GLOCKS.length; i++)
    {
        if (msg.content.includes(GLOCKS[i])) return true;
    }
    
    return false;
}

async function glockHandler(msg)
{
    let guildID = msg.guild.id;
    let channelID = msg.channel.id;
    let userID = msg.member.id;
    let user = await (database.getUser(userID, guildID));
    if (user.status == 0) return;

    database.removeKillRequests(guildID, channelID).then(async (rows) => {
        let killerMember = await msg.guild.fetchMember(userID, true);
        let killerName = killerMember.displayName;
        if (rows && rows.length>0)
        {
            let names = "";
    
            for (let i=0; i<rows.length; i++)
            {   
                $killed = await (database.killUser(rows[i].userID, guildID, killerName));
    
                if ($killed)
                {
                    let member = await msg.guild.fetchMember(rows[i].userID, true);
                    names += member.displayName;
    
                    if (i != rows.length-1)
                    {
                        names += ", ";
                    }
                }
            }

            if (names !== "")
            {
                msg.channel.send(killerName + " 🔫💀 " + names);
            }
        }else{
            let backfires = await (database.backfireUser(userID, guildID));
            let backfireEmojis = "💥".repeat(backfires);
            if (backfires >= BACKFIRE_KILLS)
            {
                $killed = await (database.killUser(userID, guildID, "Backfired!"));

                if ($killed)
                {
                    msg.channel.send(killerName + "'s gun backfired"+ backfireEmojis +"💀");
                }
            }else{
                msg.channel.send(killerName + "'s gun backfired" + backfireEmojis);
            }
        }
    });
}

function isKillPhrase(msg)
{
    for(let i=0; i < KILL_PHRASE.length; i++)
    {
        if (msg.content.toLowerCase().includes(KILL_PHRASE[i])) return true;
    }
    
    return false;
}

async function killHandler(msg)
{
    let guildID = msg.guild.id;
    let channelID = msg.channel.id;
    let userID = msg.member.id;
    let user = await (database.getUser(userID, guildID));
    if (user.status == 0) return;

    database.killRequest(userID, guildID, channelID)
    .then(() => {
        (()=> {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve();
                }, SCORE_TIMER)
            });
        })()
        .then(() => {

            database.deleteKillRequest(userID, guildID, channelID)
            .then((isScore) => {

                if (isScore)
                {
                    database.scoreUser(userID, guildID, 1).then(($score)=>{
                        msg.channel.send(msg.member.displayName + " scored a point!");
                    });
                }
            });
        });
    });
}

const commandHandlers = {
    "scoreboard": async function(parsed, msg)
    {
        let rows = await (database.getAllUsers(msg.guild.id));
        let scoreboard = [["", "Name", "Score", "Backfires", "Status"]];
        if (rows)
        {
            
            for(let i=0; i<rows.length; i++)
            {
                let row = [];
                let displayName = (await msg.guild.fetchMember(rows[i].userID, true)).displayName;
                let score = rows[i].score;
                let backfires = rows[i].backfires;
                let status = (rows[i].status==1)? "Alive" : "Dead";
                row.push((i + 1) + ".");
                row.push(displayName);
                row.push(score);
                row.push(backfires);
                row.push(status);
                scoreboard.push(row);
            }

            let output = "```" + table(scoreboard, {align: ['l', 'l', 'r', 'r', 'l']}) + "```";
            msg.channel.send(output);
        }
    },
    "reset": async function(parsed, msg)
    {
        await (database.resetAllUsers(msg.guild.id));
        await (database.clearKillRequest(msg.guild.id));
    },
    "help": async function(parsed, msg)
    {
        let t = [["Command", "Usage", "Desc"]];
        let commands = COMMAND_INFO.commands;
        for (let i in commands)
        {
            let row = [commands[i].command, commands[i].usage, commands[i].description];
            t.push(row);
        }
        let output = "```" + table(t) + "```";
        msg.author.send(output);
    }
}

async function commandHandler(parsed, msg)
{
    if (commandHandlers[parsed.command] !== undefined && typeof commandHandlers[parsed.command] == "function")
    {
        (commandHandlers[parsed.command])(parsed, msg);
    }else{
        msg.channel.send(COMMAND_INFO.errorMessages["unknown"]);
    }
}

//Events

client.on('ready', () => {
    database.createSettingsTable();
    client.guilds.forEach((value, key, map) => {
        database.createGuildTables(key);
        database.createGuildSettings(key);
    });
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (client.user.id == msg.author.id)
        return;
    
    const parsed = parser.parse(msg, PREFIX);

    if (parsed.success) {
        return commandHandler(parsed, msg);
    }

    if (isKillPhrase(msg)) {
        return killHandler(msg);
    }

    if (isGlock(msg)) {
        return glockHandler(msg);
    }
});

//joined a server
client.on("guildCreate", guild => {
    database.createGuildSettings(guild.id);
    database.createGuildTables(guild.id);
})

//removed from a server
client.on("guildDelete", guild => {
    database.dropGuildTables(guild.id);
    database.deleteGuildSettings(guild.id);
})

process.on('exit', function(code) {
    database.close().then(() => {
        client.logout();
    });
});

if (process.env.DC_API_TOKEN == undefined || process.env.DC_API_TOKEN == "")
{
    console.error("ENTER YOUR DISCORD BOT TOKEN IN ./.ENV AS DC_API_TOKEN");
}else{
    database.open().then(() => {
        database.vacuum().then(()=>{
            client.login(process.env.DC_API_TOKEN);
        });
    });
}