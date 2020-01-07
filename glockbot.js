const Discord = require('discord.js');
const client = new Discord.Client();
const parser  = require('discord-command-parser');
const Database = require("./db/Database");
const fs = require('fs');
const table = require('text-table');
require('dotenv-defaults').config()

const LANG = JSON.parse(fs.readFileSync("./assets/lang.json"));
const LANG_VARS = JSON.parse(fs.readFileSync("./assets/lang-variables.json"));
const LANG_GOBALS = {
    "version": process.env.VERSION
}
const LANG_CODE = (process.env.LANG in LANG)? process.env.LANG : "EN";

const PREFIX  = '?';
const SCORE_TIMER = 10000;
const BACKFIRE_KILLS = 2;
const DISCORD_API_TOKEN = getAPIToken();
var database = new Database();

function getAPIToken()
{
    let token = undefined;
    if (process.env.NODE_ENV == "production")
    {
        token = process.env.PROD_DC_API_TOKEN;
        if (token == undefined)
        {
            token = process.env.DC_API_TOKEN;
        }
    }else{
        token = process.env.DEV_DC_API_TOKEN;
        if (token == undefined)
        {
            token = process.env.DC_API_TOKEN;
        }
    }

    return token;
}

function parseLang(lang, args)
{
    for(let i=0; i<LANG_VARS.vars.length; i++)
    {
        let key = LANG_VARS.vars[i];
        if (!lang.includes(key))
            continue;

        let temp = "\\[{" + key + "}\\]";
        lang = lang.replace(new RegExp(temp,"g"), args[key]);
    }

    for(let i=0; i<LANG_VARS.gobals.length; i++)
    {
        let key = LANG_VARS.gobals[i];
        if (!lang.includes(key))
            continue;

        let temp = "\\[{" + key + "}\\]";
        lang = lang.replace(new RegExp(temp,"g"), LANG_GOBALS[key]);
    }

    return lang
}

function isGlock(msg)
{
    for(let i=0; i < LANG[LANG_CODE]["glocks"].length; i++)
    {
        if (msg.content.includes(LANG[LANG_CODE]["glocks"][i])) return true;
    }
    
    return false;
}

async function glockHandler(msg)
{
    let guildID = msg.guild.id;
    let channelID = msg.channel.id;
    let userID = msg.member.id;
    try{
        let user = await (database.getUser(userID, guildID));
        if (user.status == 0) return;
    }catch(err){return;}

    try{
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
                    let temp = parseLang(LANG[LANG_CODE]["shot"], {"user": msg.member.displayName, "killedUsers": names});
                    msg.channel.send(temp);
                }
            }else{
                let backfires = await (database.backfireUser(userID, guildID));
                let backfireEmojis = "💥".repeat(backfires);
                if (backfires >= BACKFIRE_KILLS)
                {
                    $killed = await (database.killUser(userID, guildID, "Backfired!"));
    
                    if ($killed)
                    {
                        msg.channel.send(parseLang(LANG[LANG_CODE]["backfire"], {"user": msg.member.displayName})+ backfireEmojis +"💀");
                    }
                }else{
                    msg.channel.send(parseLang(LANG[LANG_CODE]["backfire"], {"user": msg.member.displayName}) + backfireEmojis);
                }
            }
        }).catch(() => {});
    }catch(err){return;}
}

function isKillPhrase(msg)
{
    for(let i=0; i < LANG[LANG_CODE]["killPhrases"].length; i++)
    {
        if (msg.content.toLowerCase().includes(LANG[LANG_CODE]["killPhrases"])) return true;
    }
    
    return false;
}

async function killHandler(msg)
{
    let guildID = msg.guild.id;
    let channelID = msg.channel.id;
    let userID = msg.member.id;
    try{
        let user = await (database.getUser(userID, guildID));
        if (user.status == 0) return;
    }catch(err){return}

    try{
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
                        }).catch((err) => {});
                    }
                }).catch((err) => {});
            });
        }).catch((err) => {});
    }catch(err){};
}

const commandHandlers = {
    "scoreboard": async function(parsed, msg)
    {
        try{
            let rows = await (database.getAllUsers(msg.guild.id));
            let scoreboard = [["", LANG[LANG_CODE]["scoreboard"]["name"], LANG[LANG_CODE]["scoreboard"]["score"], LANG[LANG_CODE]["scoreboard"]["backfires"], LANG[LANG_CODE]["scoreboard"]["status"]]];
            if (rows)
            {
                
                for(let i=0; i<rows.length; i++)
                {
                    let row = [];
                    let displayName = (await msg.guild.fetchMember(rows[i].userID, true)).displayName;
                    let score = rows[i].score;
                    let backfires = rows[i].backfires;
                    let status = (rows[i].status==1)? LANG[LANG_CODE]["scoreboard"]["alive"] : LANG[LANG_CODE]["scoreboard"]["dead"];
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
        }catch(err){};
    },
    "reset": async function(parsed, msg)
    {
        try{
            await (database.resetAllUsers(msg.guild.id));
            await (database.clearKillRequest(msg.guild.id));
        }catch(err){}
    },
    "info": async function(parsed, msg)
    {
        msg.channel.send(parseLang(LANG[LANG_CODE]["info"]["full"]));
    },
    "debug": async function(parsed, msg)
    {
        let output = "```GuildID: " + msg.guild.id;
        output += "\nMemberID: " + msg.member.id;
        output += "\nVersion Number: " + process.env.VERSION + "```";
        output += "\n```You can submit issues at " + LANG[LANG_CODE]["info"]["github"] + "/issues```";
        msg.channel.send(output);
    },
    "help": async function(parsed, msg)
    {
        let t = [[LANG[LANG_CODE]["commandTable"]["command"], LANG[LANG_CODE]["commandTable"]["usage"], LANG[LANG_CODE]["commandTable"]["desc"]]];
        let commands = LANG[LANG_CODE]["commands"];
        for (let i in commands)
        {
            let row = [commands[i].command, PREFIX + commands[i].usage, commands[i].description];
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
        msg.channel.send(LANG[LANG_CODE]["errorMessages"]["unknown"]);
    }
}

//Events

client.on('ready', () => {
    client.guilds.forEach((value, key, map) => {
        database.createGuildTables(key);
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

client.on('guildMemberAdd', member => {
    console.log("outside this works");
    if (member.id == client.user.id)
    {
        console.log("this works");

    }
});

//joined a server
client.on("guildCreate", guild => {
    database.createGuildTables(guild.id);
})

//removed from a server
client.on("guildDelete", guild => {
    database.dropGuildTables(guild.id);
})

process.on('exit', function(code) {
    database.close().then(() => {
        client.logout();
    }).catch((err) => {});
});

if (DISCORD_API_TOKEN === undefined)
{
    console.error("PLEASE ENTER YOUR BOT TOKEN IN THE .ENV FILE");
}else{
    database.open().then(() => {
        database.vacuum().then(()=>{
            client.login(DISCORD_API_TOKEN);
        }).catch((err) => {});
    }).catch((err) => {});
}