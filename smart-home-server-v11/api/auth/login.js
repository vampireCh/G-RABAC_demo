const express = require('express');
const bodyParser = require('body-parser');
//const mysql = require('mysql');
const ethers = require('ethers');
const { utils } = require('ethers');


const app = express();
const port = 3000;


const cors = require('cors')
app.use(cors())

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods","*");
    res.header("Content-Type", "application/json;charset=utf-8");
    next();

});

app.use(express.static('web_test'));
//配置解析表单数据的中间件，只能解析x-www-urlencoded格式的表单数据

app.use(express.urlencoded({extended:false}))
app.use(bodyParser.json());

//get接口测试
app.get('/',(req,res) => res.send("hello"))
app.get('/get',(req,res) => {
    res.send('hhhh')
});


//签名验证
app.post('/api/auth/login', async (req, res) => {
  const { account, signature, message } = req.body;

  try {
      // 恢复签名者的地址
      const signerAddress = ethers.utils.verifyMessage(message, signature);

      if (signerAddress.toLowerCase() === account.toLowerCase()) {
          // 签名验证成功
          res.json({ success: true, message: "The signature is valid." });
      } else {
          // 签名验证失败
          res.status(401).json({ success: false, message: "Invalid signature." });
      }
  } catch (error) {
      console.error(error);
      res.status(500).send("Internal server error.");
  }
});
/*使用ethers.utils.verifyMessage函数恢复出签名的地址，并将其与提供的账户地址进行比较。如果两者匹配，说明签名验证成功，用户身份验证通过。*/
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});







/*
// 登录路由
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  const query = 'SELECT * FROM useraccounts WHERE email = ? AND password = ?';
  connection.query(query, [username, password], (error, results) => {
    if (error) {
      return res.status(500).send('Server error');
    }
    if (results.length > 0) {
      res.send('Login successful');
    } else {
      res.status(401).send('Login failed');
    }
  });
});
*/

/*
// MySQL数据库连接配置
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'chen2024', // 替换为你的数据库用户名
  password: 'chen2024', // 替换为你的数据库密码
  database: 'smart-home' // 替换为你的数据库名称
});

// 连接数据库
connection.connect(error => {
  if (error) throw error;
  console.log("Successfully connected to the database.");
});
*/