// db.js
const neo4j = require('neo4j-driver');

const uri = "bolt://localhost:7687"; // 或您的Neo4j数据库地址
const user = "neo4j"; // 数据库用户名
const password = "neo4j"; // 数据库密码

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
module.exports = driver;

