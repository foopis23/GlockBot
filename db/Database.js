const sqlite3 = require("sqlite3");

const USER_TABLE_NAME = "users";
const KILL_REQUEST_TABLE_NAME = "killRequests";
const SETTING_TABLE_NAME = "guildSettings";

module.exports = class Database{

    open()
    {
        return new Promise((resolve, reject)=>{
            this.db = new sqlite3.Database("./db/database.db", (err) => {
                if (err) reject(err);
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
                if (err) reject(err);
                
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

    createSettingsTable()
    {
        let sql = "CREATE TABLE IF NOT EXISTS " + SETTING_TABLE_NAME + " (id INTEGER PRIMARY KEY AUTOINCREMENT, guildID TEXT NOT NULL, permaDeath INT DEFAULT 1, backfireAmount INT DEFAULT 2)";
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
                if (err) return reject(err);

                if (row != undefined ) return resolve();
                
                sql = "INSERT INTO " + KILL_REQUEST_TABLE_NAME + guildID + "(userID,channelID) VALUES(?,?)";
                params = [userID, channelID];
                this.db.run(sql, params, (err) => {
                    if (err) return reject(err);

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
                        if (err) return reject(err);

                        return resolve();
                    });
                }else{
                    return resolve();
                }
            });
        });
    }

    createGuildSettings(guildID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM " + SETTING_TABLE_NAME + " WHERE guildID=?";
            let params = [guildID];

            this.db.get(sql, params, (err, row)=>{
                if (err)
                    return reject(err);
                
                if (row)
                    return resolve();

                let sql = "INSERT INTO " + SETTING_TABLE_NAME + "(guildID) VALUES(?)";
                let params = [guildID];

                this.db.run(sql, params, (err) => {
                    if (err)
                        return reject();

                    return resolve();
                }); 
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
                if (err) return reject(false);

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
                    if (err) return reject(err);
    
                    return resolve(row);
                });
            });
        });
    }

    getSettings(guildID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM " + SETTING_TABLE_NAME + " WHERE guildID=?";
            let params = [guildID];
            
            this.db.get(sql, params, (err, row) => {
                if (err)
                    return reject(err);

                return resolve(row);
            });
        });
    }

    getSetting(guildID, settingKey)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT ? FROM " + SETTING_TABLE_NAME + "WHERE guildID=?";
            let params = [settingKey, guildID];

            this.db.get(sql, params, (err, row) => {
                if (err)
                    return reject(err);

                return resolve(row[settingKey]);
            });
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

    deleteKillRequest(userID, guildID, channelID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM " + KILL_REQUEST_TABLE_NAME + guildID + " WHERE userID = ? AND channelID = ?";
            let params = [userID, channelID];
            this.db.get(sql, params, (err, row) => {
                if (err) return reject(false);

                if (row === undefined ) return resolve(false);
                
                sql = "DELETE FROM " + KILL_REQUEST_TABLE_NAME + guildID + " WHERE userID = ? and channelID = ?";
                params = [userID, channelID];
                this.db.run(sql, params, (err) => {
                    if (err) return reject(err);

                    return resolve(true);
                });
            });
        });
    }

    deleteGuildSettings(guildID)
    {
        return new Promise((resolve, reject)=> {
            let sql = "DELETE FROM " + SETTING_TABLE_NAME + " WHERE guildID=?";
            let params = [guildID];

            this.db.run(sql, params, (err)=>{
                if(err)
                    return reject(err);

                return resolve();
            });
        });
    }

    removeKillRequests(guildID, channelID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM " + KILL_REQUEST_TABLE_NAME + guildID + " WHERE channelID = ?";
            let params = [channelID];
            this.db.all(sql, params, (err, rows) => {
                if (err) return reject(false);
                
                sql = "DELETE FROM " + KILL_REQUEST_TABLE_NAME + guildID + " WHERE channelID = ?";
                params = [channelID];
                this.db.run(sql, params, (err) => {
                    if (err) return reject(false);

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
                if (err) return reject(err);

                this.db.run("VACUUM", (err) => {
                    if (err) return reject(err);

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
                    if (err) return reject(false);
    
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
                    if (err) return reject(err);
    
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
                    if (err) return reject(err);

                    sql = "UPDATE "+USER_TABLE_NAME + guildID+" SET backfires = ? WHERE userID=?";
                    params = [row.backfires+1, userID];

                    this.db.run(sql, params, (err) => {
                        if (err) return reject(err);

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
                    if (err) return reject(false);

                    sql = "UPDATE "+USER_TABLE_NAME + guildID+" SET score = ? WHERE userID=?";
                    params = [row.score+increament, userID];

                    this.db.run(sql, params, (err) => {
                        if (err) return reject(false);

                        resolve(row.score+1);
                    });
                });
            });
        });
    }

    resetUser(userID, guildID)
    {
        return new Promise((resolve, reject) => {
            this.userExist(userID, guildID).then(() => {
                let sql = "UPDATE "+USER_TABLE_NAME + guildID+" SET score = 0, backfires = 0, status = 1, causeOfDeath = NULL WHERE userID=?";
                let params = [userID];

                this.db.run(sql, params, (err) => {
                    if (err) reject(err);

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
                if (err) reject(err);

                resolve();
            });
        });
    }

    updateSetting(guildID, settingKey, value)
    {
        let sql = "UPDATE " + SETTING_TABLE_NAME + " SET ?=? WHERE guildID=?";
        let params = [settingKey, value, guildID];

        this.db.run(sql, params, (err) => {
            if (err)
                return reject(err);

            resolve();
        });
    }
}