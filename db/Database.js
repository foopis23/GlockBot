const sqlite3 = require("sqlite3");

const userTable = "users";

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

    vacuum()
    {
        return new Promise((resolve, reject)=>{
            this.db.run("VACUUM", (err) => {
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

    createUserTable()
    {
        return new Promise((resolve, reject) => {
            this.db.run("CREATE TABLE IF NOT EXISTS "+userTable+" (id INTEGER PRIMARY KEY AUTOINCREMENT, userID TEXT, guildID TEXT, score INTEGER, backfires INT, status INTEGER, causeOfDeath TEXT)", (err) => {
                if (err) return reject(console.error(err.message));

                return resolve();
            });
        });
    }

    getAllUsers(guildID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM users WHERE guildID=? ORDER BY score DESC";
            let params = [guildID];
            this.db.all(sql, params, (err, rows) => {
                if (err) return reject(false);

                resolve(rows);
            })
        });
    }

    userExist(userID, guildID)
    {
        return new Promise((resolve, reject) => {
            let sql = `SELECT * FROM users WHERE userID=? and guildID=?`;
            let params = [userID, guildID];

            this.db.get(sql, params, (err, row) =>{
                if (err) console.error(err.message);

                if (row == undefined)
                {
                    sql = "INSERT INTO "+userTable+"(userID,guildID,score,backfires,status,causeOfDeath) VALUES(?,?,?,?,?,?)";
                    params = [userID, guildID, 0, 0, 1, null];
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

    resetUser(userID, guildID)
    {
        return new Promise((resolve, reject) => {
            this.userExist(userID, guildID).then(() => {
                let sql = "UPDATE users SET score = 0, backfires = 0, status = 1, causeOfDeath = NULL WHERE userID=? AND guildID=?";
                let params = [userID, guildID];

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
            let sql = "UPDATE users SET score = 0, backfires = 0, status = 1, causeOfDeath = NULL WHERE guildID=?";
            let params = [guildID];

            this.db.run(sql, params, (err) => {
                if (err) reject(err);

                resolve();
            });
        });
    }

    getUser(userID, guildID)
    {
        return new Promise((resolve, reject) => {
            this.userExist(userID, guildID).then(() => {
                let sql = `SELECT * FROM users WHERE userID=? AND guildID=?`;
                let params = [userID, guildID];
    
                this.db.get(sql, params, (err, row) =>{
                    if (err) return reject(err);
    
                    return resolve(row);
                });
            });
        });
    }

    killUser(userID, guildID, causeOfDeath)
    {
        return new Promise((resolve, reject) => {
            this.userExist(userID, guildID).then(() => {
                let sql = `UPDATE users SET status = 0, causeOfDeath = ? WHERE userID=? AND guildID=?`;
                let params = [causeOfDeath, userID, guildID];
    
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
                let sql = `UPDATE users SET status = 1, causeOfDeath = ? WHERE userID=? AND guildID=?`;
                let params = [null, userID, guildID];
    
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
                let sql = `SELECT backfires FROM users WHERE userID=? AND guildID=?`;
                let params = [userID, guildID];
    
                this.db.get(sql, params, (err, row) =>{
                    if (err) return reject(err);

                    sql = "UPDATE users SET backfires = ? WHERE userID=? AND guildID=?";
                    params = [row.backfires+1, userID, guildID];

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
                let sql = `SELECT score FROM users WHERE userID=? AND guildID=?`;
                let params = [userID, guildID];
    
                this.db.get(sql, params, (err, row) =>{
                    if (err) return reject(false);

                    sql = "UPDATE users SET score = ? WHERE userID=? AND guildID=?";
                    params = [row.score+increament, userID, guildID];

                    this.db.run(sql, params, (err) => {
                        if (err) return reject(false);

                        resolve(row.score+1);
                    });
                });
            });
        });
    }

    createKillRequestTable()
    {
        return new Promise((resolve, reject) => {
            let sql = "CREATE TABLE IF NOT EXISTS killRequests (id INTEGER PRIMARY KEY AUTOINCREMENT, userID TEXT, guildID TEXT, channelID TEXT)";
            this.db.run(sql, (err) => {
                if (err) return reject(console.error(err.message));

                return resolve();
            });
        });
    }

    killRequest(userID, guildID, channelID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM killRequests WHERE userID = ? AND guildID = ?";
            let params = [userID, guildID];
            this.db.get(sql, params, (err, row) => {
                if (err) return reject(err);

                if (row != undefined ) return resolve();
                
                sql = "INSERT INTO killRequests(userID,guildID,channelID) VALUES(?,?,?)";
                params = [userID, guildID, channelID];
                this.db.run(sql, params, (err) => {
                    if (err) return reject(err);

                    return resolve();
                });
            });
        });
    }

    deleteKillRequest(userID, guildID, channelID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM killRequests WHERE userID = ? AND guildID = ? AND channelID = ?";
            let params = [userID, guildID, channelID];
            this.db.get(sql, params, (err, row) => {
                if (err) return reject(false);

                if (row === undefined ) return resolve(false);
                
                sql = "DELETE FROM killRequests WHERE userID = ? AND guildID = ? and channelID = ?";
                params = [userID, guildID, channelID];
                this.db.run(sql, params, (err) => {
                    if (err) return reject(err);

                    return resolve(true);
                });
            });
        });
    }

    removeKillRequests(guildID, channelID)
    {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM killRequests WHERE guildID = ? and channelID = ?";
            let params = [guildID, channelID];
            this.db.all(sql, params, (err, rows) => {
                if (err) return reject(false);
                
                sql = "DELETE FROM killRequests WHERE guildID = ? and channelID = ?";
                params = [guildID, channelID];
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
            let sql = "DELETE FROM killRequest WHERE guildID = ?";
            let params = [guildID];
            this.db.run(sql, params, (err)=>{
                if (err) return reject(err);

                this.db.run("VACUUM", (err) => {
                    if (err) return reject(err);

                    resolve();
                });
            });
        });
    }
}