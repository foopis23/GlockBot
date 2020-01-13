const sqlite3 = require("sqlite3");

const USER_TABLE_NAME = "users";
const KILL_REQUEST_TABLE_NAME = "killRequests";
const SETTING_TABLE_NAME = "setting";

module.exports = class Database{

    open()
    {
        return new Promise((resolve, reject)=>{
            this.db = new sqlite3.Database("./db/database.db", (err) => {
                if (err) reject(console.error(err.message));
                resolve();
            });
        });
    }

    close()
    {
        return new Promise((resolve, reject)=>{
            this.db.close((err) => {
                if (err) console.error(err.message);
                resolve();
            });
        });
    }

    vacuum()
    {
        return new Promise((resolve, reject)=>{
            this.db.run("VACUUM", (err) => {
                if (err) reject(console.error(err.message));
                
                resolve();
            });
        });
    }

    /*
    .########....###....########..##.......########..######.
    ....##......##.##...##.....##.##.......##.......##....##
    ....##.....##...##..##.....##.##.......##.......##......
    ....##....##.....##.########..##.......######....######.
    ....##....#########.##.....##.##.......##.............##
    ....##....##.....##.##.....##.##.......##.......##....##
    ....##....##.....##.########..########.########..######.
    */

    createGuildTables(guildID)
    {
        return new Promise(async (resolve, reject) => {
            await (this.createUserTable(guildID));
            await (this.createKillRequestTable(guildID));
            await (this.createSettingTable(guildID));
            resolve();
        })
    }

    createUserTable(guildID)
    {
        return new Promise((resolve, reject) => {
            this.db.run("CREATE TABLE IF NOT EXISTS "+USER_TABLE_NAME + guildID+" (id INTEGER PRIMARY KEY AUTOINCREMENT, userID TEXT, score INTEGER, backfires INT, status INTEGER, causeOfDeath TEXT)", (err) => {
                if (err) return reject(console.error(err.message));

                return resolve();
            });
        });
    }

    createKillRequestTable(guildID)
    {
        return new Promise((resolve, reject) => {
            let sql = "CREATE TABLE IF NOT EXISTS " + KILL_REQUEST_TABLE_NAME + guildID + " (id INTEGER PRIMARY KEY AUTOINCREMENT, userID TEXT, channelID TEXT)";
            this.db.run(sql, (err) => {
                if (err) return reject(console.error(err.message));

                return resolve();
            });
        });
    }

    createSettingTable()
    {
        return new Promise((resolve, reject) => {
            let sql = "CREATE TABLE IF NOT EXISTS " + SETTING_TABLE_NAME  + " (id INTEGER PRIMARY KEY AUTOINCREMENT, guildID TEXT, lang TEXT, permaDeath INT, backfireAmount INT, scoreTime INT)";
            this.db.run(sql, (err) => {
                if (err) return reject(console.error(err.message));

                return resolve();
            });
        });
    }

    dropGuildTables(guildID)
    {
        return new Promise(async (resolve, reject) => {
            await (this.dropUserTable(guildID));
            await (this.dropKillRequestTable(guildID));
            resolve();
        })
    }

    dropUserTable(guildID)
    {
        return new Promise((resolve, reject) => {
            let sql = "DROP TABLE IF EXISTS "+USER_TABLE_NAME + guildID
            this.db.run(sql, (err) => {
                if (err) return reject(console.error(err.message));

                return resolve();
            });
        });
    }

    dropKillRequestTable(guildID)
    {
        return new Promise((resolve, reject) => {
            let sql = "DROP TABLE IF EXISTS " + KILL_REQUEST_TABLE_NAME + guildID;
            this.db.run(sql, (err) => {
                if (err) return reject(console.error(err.message));

                return resolve();
            });
        });
    }

    /*
    ..######..########..########....###....########.########
    .##....##.##.....##.##.........##.##......##....##......
    .##.......##.....##.##........##...##.....##....##......
    .##.......########..######...##.....##....##....######..
    .##.......##...##...##.......#########....##....##......
    .##....##.##....##..##.......##.....##....##....##......
    ..######..##.....##.########.##.....##....##....########
    */

    killRequest(userID, guildID, channelID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM " + KILL_REQUEST_TABLE_NAME + guildID + " WHERE userID = ?";
            let params = [userID];
            this.db.get(sql, params, (err, row) => {
                if (err) return reject(console.error(err.message));

                if (row != undefined ) return resolve();
                
                sql = "INSERT INTO " + KILL_REQUEST_TABLE_NAME + guildID + "(userID,channelID) VALUES(?,?)";
                params = [userID, channelID];
                this.db.run(sql, params, (err) => {
                    if (err) return reject(console.error(err.message));

                    return resolve();
                });
            });
        });
    }

    userExist(userID, guildID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM "+USER_TABLE_NAME + guildID+" WHERE userID=? ";
            let params = [userID];

            this.db.get(sql, params, (err, row) =>{
                if (err) console.error(err.message);

                if (row == undefined)
                {
                    sql = "INSERT INTO "+USER_TABLE_NAME + guildID+"(userID,score,backfires,status,causeOfDeath) VALUES(?,?,?,?,?)";
                    params = [userID, 0, 0, 1, null];
                    this.db.run(sql, params, (err) => {
                        if (err) return reject(console.error(err.message));

                        return resolve();
                    });
                }else{
                    return resolve();
                }
            });
        });
    }

    /*
    ..######...########.########
    .##....##..##..........##...
    .##........##..........##...
    .##...####.######......##...
    .##....##..##..........##...
    .##....##..##..........##...
    ..######...########....##...
    */

    getAllUsers(guildID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM "+USER_TABLE_NAME + guildID+" ORDER BY score DESC";
            this.db.all(sql, (err, rows) => {
                if (err) return reject(console.error(err.message));

                resolve(rows);
            })
        });
    }

    getUser(userID, guildID)
    {
        return new Promise((resolve, reject) => {
            this.userExist(userID, guildID).then(() => {
                let sql = "SELECT * FROM "+USER_TABLE_NAME + guildID+" WHERE userID=?";
                let params = [userID];
    
                this.db.get(sql, params, (err, row) =>{
                    if (err) return reject(console.error(err.message));
    
                    return resolve(row);
                });
            });
        });
    }

    getSettings(guildID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM " + SETTING_TABLE_NAME + " WHERE guildID=?";
            let params = [guildId];

            this.db.get(sql, params, (err, row) => {
                if (err) return reject(console.error(err.message));

                return resolve(row);
            });
        });
    }

    getSetting(guildID, key)
    {
        return new Promise(async (resolve, reject) => {
            let settings = await getSettings(guildID);
            resolve(settings[key]);
        });
    }

    /*
    .########..########.##.......########.########.########
    .##.....##.##.......##.......##..........##....##......
    .##.....##.##.......##.......##..........##....##......
    .##.....##.######...##.......######......##....######..
    .##.....##.##.......##.......##..........##....##......
    .##.....##.##.......##.......##..........##....##......
    .########..########.########.########....##....########
    */

    resetUser(userID, guildID)
    {
        return new Promise((resolve, reject) => {
            this.userExist(userID, guildID).then(() => {
                let sql = "UPDATE "+USER_TABLE_NAME + guildID+" SET score = 0, backfires = 0, status = 1, causeOfDeath = NULL WHERE userID=?";
                let params = [userID];

                this.db.run(sql, params, (err) => {
                    if (err) reject(console.error(err.message));

                    resolve();
                });
            });
        });
    }

    resetAllUsers(guildID)
    {
        return new Promise((resolve, reject) => {
            let sql = "UPDATE "+USER_TABLE_NAME + guildID+" SET score = 0, backfires = 0, status = 1, causeOfDeath = NULL";

            this.db.run(sql, (err) => {
                if (err) reject(console.error(err.message));

                resolve();
            });
        });
    }

    deleteKillRequest(userID, guildID, channelID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM " + KILL_REQUEST_TABLE_NAME + guildID + " WHERE userID = ? AND channelID = ?";
            let params = [userID, channelID];
            this.db.get(sql, params, (err, row) => {
                if (err) return reject(console.error(err.message));

                if (row === undefined ) return resolve(false);
                
                sql = "DELETE FROM " + KILL_REQUEST_TABLE_NAME + guildID + " WHERE userID = ? and channelID = ?";
                params = [userID, channelID];
                this.db.run(sql, params, (err) => {
                    if (err) return reject(console.error(err.message));

                    return resolve(true);
                });
            });
        });
    }

    removeKillRequests(guildID, channelID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM " + KILL_REQUEST_TABLE_NAME + guildID + " WHERE channelID = ?";
            let params = [channelID];
            this.db.all(sql, params, (err, rows) => {
                if (err) return reject(console.error(err.message));
                
                sql = "DELETE FROM " + KILL_REQUEST_TABLE_NAME + guildID + " WHERE channelID = ?";
                params = [channelID];
                this.db.run(sql, params, (err) => {
                    if (err) return reject(console.error(err.message));

                    return resolve(rows);
                });
            });
        });
    }

    clearKillRequest(guildID)
    {
        return new Promise((resolve, reject) => {
            let sql = "DELETE FROM "+ KILL_REQUEST_TABLE_NAME + guildID;
            this.db.run(sql, (err)=>{
                if (err) return reject(console.error(err.message));

                this.db.run("VACUUM", (err) => {
                    if (err) return reject(console.error(err.message));

                    resolve();
                });
            });
        });
    }
    
    /*
    .##.....##.########..########.....###....########.########
    .##.....##.##.....##.##.....##...##.##......##....##......
    .##.....##.##.....##.##.....##..##...##.....##....##......
    .##.....##.########..##.....##.##.....##....##....######..
    .##.....##.##........##.....##.#########....##....##......
    .##.....##.##........##.....##.##.....##....##....##......
    ..#######..##........########..##.....##....##....########
    */

    killUser(userID, guildID, causeOfDeath)
    {
        return new Promise((resolve, reject) => {
            this.userExist(userID, guildID).then(() => {
                let sql = "UPDATE "+USER_TABLE_NAME + guildID+" SET status = 0, causeOfDeath = ? WHERE userID=?";
                let params = [causeOfDeath, userID];
    
                this.db.run(sql, params, (err) =>{
                    if (err) return reject(console.error(err.message));
    
                    resolve(true);
                });
            });
        });
    }

    reviveUser(userID, guildID)
    {
        return new Promise((resolve, reject) => {
            this.userExist(userID, guildID).then(() => {
                let sql = "UPDATE "+USER_TABLE_NAME + guildID+" SET status = 1, causeOfDeath = ? WHERE userID=?";
                let params = [null, userID];
    
                this.db.run(sql, params, (err) =>{
                    if (err) return reject(console.error(err.message));
    
                    resolve();
                });
            });
        });
    }

    backfireUser(userID, guildID)
    {
        return new Promise((resolve, reject) => {
            this.userExist(userID, guildID).then(() => {
                let sql = "SELECT backfires FROM "+USER_TABLE_NAME + guildID+" WHERE userID=?";
                let params = [userID];
    
                this.db.get(sql, params, (err, row) =>{
                    if (err) return reject(console.error(err.message));

                    sql = "UPDATE "+USER_TABLE_NAME + guildID+" SET backfires = ? WHERE userID=?";
                    params = [row.backfires+1, userID];

                    this.db.run(sql, params, (err) => {
                        if (err) return reject(console.error(err.message));

                        resolve(row.backfires+1);
                    });
                });
            });
        });
    }

    scoreUser(userID, guildID, increament)
    {
        return new Promise((resolve, reject) => {
            this.userExist(userID, guildID).then(() => {
                if (increament == undefined) increament = 1;
                let sql = "SELECT score FROM "+USER_TABLE_NAME + guildID+" WHERE userID=?";
                let params = [userID];
    
                this.db.get(sql, params, (err, row) =>{
                    if (err) return reject(console.error(err.message));

                    sql = "UPDATE "+USER_TABLE_NAME + guildID+" SET score = ? WHERE userID=?";
                    params = [row.score+increament, userID];

                    this.db.run(sql, params, (err) => {
                        if (err) return reject(console.error(err.message));

                        resolve(row.score+1);
                    });
                });
            });
        });
    }

    setSetting(guildID, key, value)
    {
        return new Promise(async (resolve, reject) => {
            let sql = "UPDATE " + SETTING_TABLE_NAME + " SET " + key + " = ? WHERE guildID = ?";
            let params = [value, guildID];
            this.db.run(sql, params, (err) => {
                if (err) return reject(console.error(err.message));

                resolve();
            });
        });
    }
}