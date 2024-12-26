/*******************************************************
 * 作者声明 (Author's Declaration)
 * 
 * 项目名称: 支持细粒度策略的图结构混合访问控制模型
 * 作者: Chen han
 * 日期: 2024-12-26
 * 
 * 声明:
 * 1. 本项目所有代码为作者原创，任何未经授权的复制、修改或分发行为均属于侵权。
 * 2. 本项目采用 [填写你的开源协议，如 MIT License 或 "保留所有权利"]，使用时需遵循相关条款。
 * 3. 如需商用或其他用途，请联系作者获取书面授权。
 * 
 * 适用范围:
 * 本项目适用于动态访问控制、基于区块链的安全监控、上下文推理与异常行为检测领域的研究与开发。
 * 
 * 联系方式:
 * 邮箱: [填写你的邮箱，例如 vampire24cc@163.com]
 * GitHub: [填写你的 GitHub 地址，例如 https://github.com/your-repo]
 * 
 * 感谢:
 * 感谢所有支持者、开源社区及相关技术提供的帮助和资源。
 *******************************************************/

/*******************************************************
 * 加载依赖模块
 *******************************************************/
const express = require('express');
const bodyParser = require('body-parser');
const neo4j = require('neo4j-driver');
const { ethers } = require('ethers');
const { performance } = require('perf_hooks');
require('dotenv').config();
const Web3 = require('web3');
const cors = require('cors');

/*******************************************************
 * 加载自定义的异常检测模块
 *******************************************************/
const {
  detectMultipleFailuresWithinShortPeriod,
  detectRepeatedAccessToSameResourceWithinShortPeriod
} = require('./AccessPatternDetection');

/*******************************************************
 * 加载自定义的用户行为偏差检测模块
 *******************************************************/
const {
  findAccessEventsWithConditionValidationFailures,
  findAccessEventsWithNoPolicyFound,
  updateRiskScore
} = require('./UserBehaviorDeviation'); // 根据实际文件路径修改

/*******************************************************
 * Neo4j 数据库连接配置
 *******************************************************/
const uri = 'bolt://localhost:7687';
const user = 'neo4j';
const password = 'neo4j';
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

/*******************************************************
 * 创建 Express 应用
 *******************************************************/
const app = express();
app.use(cors()); // 允许跨域请求
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());

/*******************************************************
 * Web3 与智能合约相关配置
 *******************************************************/
// 从环境变量读取 WebSocket 端点，若不存在则使用本地
const websocketURL = process.env.WEBSOCKET_ENDPOINT || 'ws://localhost:7545';
const web3 = new Web3(new Web3.providers.WebsocketProvider(websocketURL));

// 智能合约 ABI 和地址（请根据实际路径或合约信息修改）
const contractABI = require('../path/contractABI.json');
const contractAddress = '0x39aa6fC93d728215BbCF48b5C4BaFD0205195A04';

// 创建智能合约实例
const contract = new web3.eth.Contract(contractABI, contractAddress);

/*******************************************************
 * 监听合约事件 - UserRegistered
 * 注册用户事件，当检测到新的 UserRegistered 事件时，将该用户信息
 * 存储或更新在 Neo4j 数据库中（默认 approved = false）
 *******************************************************/
contract.events.UserRegistered({
  fromBlock: 0
}).on('data', async (event) => {
  const session = driver.session();
  try {
    const { userAddress, username } = event.returnValues;

    // 判断数据库中是否存在该用户（且 approved = false）
    const userExistsResult = await session.run(
      'MATCH (s:Subject {ethereumAddress: $ethereumAddress, approved: false}) RETURN s',
      { ethereumAddress: userAddress }
    );

    // 如果没有，则创建一个新的 Subject 节点
    if (userExistsResult.records.length === 0) {
      await session.run(
        'CREATE (s:Subject {ethereumAddress: $ethereumAddress, username: $username, approved: false}) RETURN s',
        { ethereumAddress: userAddress, username: username }
      );
      console.log('User Registered in Neo4j:', { ethereumAddress: userAddress, username: username });
    } else {
      console.log('Unapproved user already exists in Neo4j:', { ethereumAddress: userAddress, username: username });
    }
  } catch (error) {
    console.error('Error querying or saving user to Neo4j:', error);
  } finally {
    await session.close();
  }
}).on('error', console.error);

/*******************************************************
 * 监听合约事件 - UserApprovalChanged
 * 当检测到用户审批状态改变时，更新数据库中的 approved 状态
 *******************************************************/
contract.events.UserApprovalChanged({
  fromBlock: 'latest'
}).on('data', async (event) => {
  const session = driver.session();
  try {
    const { userAddress, isApproved } = event.returnValues;

    // 更新用户的 approved 状态
    await session.run(
      'MATCH (s:Subject {ethereumAddress: $ethereumAddress}) SET s.approved = $isApproved RETURN s',
      { ethereumAddress: userAddress, isApproved: isApproved }
    );
    console.log('User approval status updated in Neo4j:', { ethereumAddress: userAddress, isApproved: isApproved });
  } catch (error) {
    console.error('Error updating user approval status in Neo4j:', error);
  } finally {
    await session.close();
  }
}).on('error', console.error);

/*******************************************************
 * 监听合约事件 - AccessFrozen
 * 当检测到用户访问被冻结时，将数据库中该用户的 approved 设置为 false
 *******************************************************/
contract.events.AccessFrozen({
  fromBlock: 'latest'
}).on('data', async (event) => {
  const session = driver.session();
  try {
    const { userAddress } = event.returnValues;
    await session.run(
      'MATCH (s:Subject {ethereumAddress: $ethereumAddress}) SET s.approved = false RETURN s',
      { ethereumAddress: userAddress }
    );
    console.log('User access frozen in Neo4j:', { ethereumAddress: userAddress });
  } catch (error) {
    console.error('Error freezing user access in Neo4j:', error);
  } finally {
    await session.close();
  }
}).on('error', console.error);

/*******************************************************
 * 监听合约事件 - AccessEventRecorded
 * 当检测到访问事件被记录时，将该访问事件信息存储到 Neo4j
 *******************************************************/
contract.events.AccessEventRecorded({
  fromBlock: 'latest'
}).on('data', async (event) => {
  const session = driver.session();
  try {
    const { userAddress, eventType, reason, timestamp } = event.returnValues;
    // 创建 AccessEvent 节点并与对应 Subject 建立关系
    await session.run(
      'MATCH (s:Subject {ethereumAddress: $ethereumAddress}) \
       CREATE (a:AccessEvent {eventType: $eventType, reason: $reason, timestamp: $timestamp}) \
       CREATE (s)-[:HAS_EVENT]->(a) RETURN a',
      { ethereumAddress: userAddress, eventType, reason, timestamp }
    );
    console.log('Access event recorded in Neo4j:', { userAddress, eventType, reason, timestamp });
  } catch (error) {
    console.error('Error recording access event in Neo4j:', error);
  } finally {
    await session.close();
  }
}).on('error', console.error);

/*******************************************************
 * 定期检测高风险用户，若超阈值则冻结其访问
 * checkAndFreezeUsers 函数每隔一定时间被调用
 * 示例：这里是 60000000 毫秒（请根据实际需要修改）
 *******************************************************/
async function checkAndFreezeUsers() {
  const session = driver.session();
  try {
    // 查询风险分数大于指定阈值的用户
    const result = await session.run(
      'MATCH (s:Subject) WHERE s.riskScore > $riskThreshold RETURN s',
      { riskThreshold: 100 }
    );

    console.log(`Total processed users: ${result.records.length}`);

    for (const record of result.records) {
      const user = record.get('s').properties;
      const userAddress = user.ethereumAddress;
      const riskScore = user.riskScore;
      const username = user.username;

      console.log(`Updating risk score in blockchain: Username: ${username}, Risk Score: ${riskScore}`);
      console.log(`Parameters being sent to smart contract: Address = ${userAddress} (Type: ${typeof userAddress}), Risk Score = ${riskScore} (Type: ${typeof riskScore})`);

      try {
        // 调用合约方法更新链上风险分数
        const tx = await contract.methods.updateRiskScoreExternally(userAddress, riskScore).send({ 
          from: '0xF6CA34908fbA18F8525d94dB17BcA7B0649740C7'
        });
        
        console.log('Blockchain transaction successful:', tx);
        console.log('Transaction hash:', tx.transactionHash);

        // 冻结用户（设置 isApproved = false）
        await session.run(
          'MATCH (s:Subject { ethereumAddress: $ethereumAddress }) SET s.isApproved = false RETURN s.name',
          { ethereumAddress: userAddress }
        );
        console.log(`User frozen: Username: ${username}, Risk Score: ${riskScore}`);
      } catch (blockchainError) {
        console.error(`Error updating blockchain for user ${username}:`, blockchainError);
      }
    }
  } catch (error) {
    console.error('Error processing users:', error);
  } finally {
    await session.close();
  }
}

// 每隔 60000000 毫秒执行检查
setInterval(checkAndFreezeUsers, 60000000);

/*******************************************************
 * 管理接口 - 获取待审批用户列表
 *******************************************************/
app.get('/api/admin/pendingUsers', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run('MATCH (s:Subject {approved: false}) RETURN s');
    const pendingUsers = result.records.map(record => record.get('s').properties);
    res.json(pendingUsers);
  } catch (error) {
    console.error('Error fetching pending users from Neo4j:', error);
    res.status(500).send('Error fetching data');
  } finally {
    await session.close();
  }
});

/*******************************************************
 * 管理接口 - 审批用户
 *******************************************************/
app.post('/api/admin/approveUser/:ethereumAddress', async (req, res) => {
  const { ethereumAddress } = req.params;
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (s:Subject {ethereumAddress: $ethereumAddress}) SET s.approved = true RETURN s',
      { ethereumAddress }
    );

    if (result.records.length > 0) {
      res.send({ message: 'User approved successfully' });
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error approving user in Neo4j:', error);
    res.status(500).send('Error updating data');
  } finally {
    await session.close();
  }
});

/*******************************************************
 * 管理接口 - 检查用户审批状态
 *******************************************************/
app.post('/api/admin/checkUserApproval', async (req, res) => {
  const { ethereumAddress } = req.body;
  const session = driver.session();
  try {
    // 忽略大小写进行匹配
    const result = await session.run(
      'MATCH (s:Subject) WHERE toLower(s.ethereumAddress) = $ethereumAddress RETURN s.approved as isApproved',
      { ethereumAddress: ethereumAddress.toLowerCase() }
    );

    if (result.records.length === 0) {
      return res.json({ isApproved: false, message: "No matching user found." });
    } else {
      const isApproved = result.records[0].get('isApproved');
      return res.json({ isApproved });
    }
  } catch (error) {
    console.error('Error checking user approval in Neo4j:', error.message);
    return res.status(500).send('Error checking user approval');
  } finally {
    await session.close();
  }
});

/*******************************************************
 * 验证签名接口
 * 用 ethers.utils.verifyMessage(message, signature) 进行校验
 *******************************************************/
app.post('/api/verifySignature', (req, res) => {
  try {
    const { account, message, signature } = req.body;
    
    console.log("[DEBUG] account:", account);
    console.log("[DEBUG] message:", message);
    console.log("[DEBUG] signature:", signature);

    // 使用 ethers.js 内置 verifyMessage
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    console.log("[DEBUG] recoveredAddress:", recoveredAddress);

    // 对比恢复出的地址和前端传来的 account
    if (recoveredAddress.toLowerCase() === account.toLowerCase()) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Address mismatch' });
    }
  } catch (error) {
    console.error("Error verifying signature:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});



/*******************************************************
 * 主授权函数
 * 查找匹配到的 Policy -> SubPolicy -> Condition。
 * 如果所有 SubPolicy 都校验通过，则授权，否则拒绝。
 *******************************************************/
async function checkAuthorization(request, session) {
  const { Sub, Act, Obj, Env } = request;
  let isAuthorized = true;
  let authorizedPolicy = '';
  let successfulConditions = {};

  try {
    const policyResult = await session.run(
      `MATCH (sub:Subject {name: $Sub})-[:HAS_ATTRIBUTE]->(sa:SubjectAttribute),
            (sa)-[:HAS]->(p:Policy)-[:APPLIED_TO]->(oa:ObjectAttribute),
            (oa)<-[:HAS_ATTRIBUTE]-(obj:Object {name: $Obj}),
            (p)-[:ACT_CON]->(op:Operation {name: $Act})
       OPTIONAL MATCH (p)-[:HAS]->(sp:SubPolicy)
       RETURN p, collect(sp) as subPolicies`,
      { Sub, Act, Obj }
    );

    // 如果未匹配到任何策略，则拒绝
    if (policyResult.records.length === 0) {
      console.log(`No policy found, authorization denied.`);
      await createLogsAndRelations(request, Env, "Nopolicyfound", false, successfulConditions, session);
      return { isAuthorized: false, authorizedPolicy, successfulConditions };
    }

    // 对匹配到的策略逐一进行检测
    for (const record of policyResult.records) {
      const policy = record.get('p');
      const subPolicies = record.get('subPolicies').filter(sp => sp != null);

      console.log(`Found policy: ${policy.properties.name}`);

      // 如果该策略没有子策略，默认无条件通过
      if (subPolicies.length === 0) {
        console.log(`Granting unconditional authorization for policy: ${policy.properties.name}`);
        authorizedPolicy = policy.properties.name;
        return { isAuthorized, authorizedPolicy, successfulConditions };
      }

      // 若有子策略，需要逐一校验
      for (const sp of subPolicies) {
        console.log(`Validating subPolicy: ${sp.properties.name}`);
        const subPolicyResult = await validateSubPolicyConditions(sp, Env, session, Sub);
        if (!subPolicyResult) {
          console.log(`Authorization denied due to failed condition in subPolicy '${sp.properties.name}'`);
          isAuthorized = false;
          await createLogsAndRelations(request, Env, "Contextualconditionvalidationfailed", false, successfulConditions, session);
          return { isAuthorized, authorizedPolicy, successfulConditions };
        } else {
          // 合并成功的条件
          successfulConditions = { ...successfulConditions, ...subPolicyResult };
        }
      }

      // 所有子策略都通过
      authorizedPolicy = policy.properties.name;
      console.log(`Authorization granted for '${Sub}' on '${Obj}' with action '${Act}' by policy '${policy.properties.name}'.`);
      return { isAuthorized, authorizedPolicy, successfulConditions };
    }
  } catch (error) {
    console.error('Error during authorization check:', error);
    isAuthorized = false;
  }

  // 如果没有任何可用策略或出现错误，统一当做拒绝处理
  await createLogsAndRelations(request, Env, "Contextualconditionvalidationfailed", false, successfulConditions, session);
  return { isAuthorized, authorizedPolicy, successfulConditions };
}

/*******************************************************
 * 验证子策略的所有条件
 * 若 subPolicy.type = 'user' 则会将 Subject 节点属性合并到 Env
 *******************************************************/
async function validateSubPolicyConditions(subPolicy, Env, session, subjectName) {
  // 获取该子策略下的所有 Context 条件
  const conditionsResult = await session.run(
    `MATCH (sp:SubPolicy {name: $subPolicyName})-[:CONDITION]->(c:Context)
     RETURN c as condition`,
    { subPolicyName: subPolicy.properties.name }
  );
  const conditions = conditionsResult.records.map(record => record.get('condition'));

  // 获取子策略类型（若没定义则默认为 'environment'）
  const subPolicyType = subPolicy.properties.type || 'environment';
  let mergedEnv = { ...Env };

  // 当子策略类型是 user，则将数据库中 Subject 的属性合并到 Env
  if (subPolicyType === 'user') {
    let subjectProperties = {};
    try {
      const subjectQuery = await session.run(
        'MATCH (s:Subject {name: $subjectName}) RETURN s',
        { subjectName }
      );
      if (subjectQuery.records.length > 0) {
        subjectProperties = subjectQuery.records[0].get('s').properties || {};
      }
    } catch (err) {
      console.error('Error fetching subject properties:', err);
    }

    // 合并 Subject 属性到 Env（如果有相同键，以 Subject 属性为准）
    mergedEnv = { ...mergedEnv, ...subjectProperties };
  }

  console.log(
    `Validating conditions for sub-policy '${subPolicy.properties.name}' with Env: ` +
    JSON.stringify(mergedEnv)
  );

  // 验证子策略下的所有条件
  const validationResults = await validateConditions(conditions, mergedEnv);
  if (validationResults) {
    return validationResults;
  } else {
    console.log(`One or more conditions failed for sub-policy '${subPolicy.properties.name}'`);
    return false;
  }
}

/*******************************************************
 * 验证具体条件列表：从 Env 中取值进行判断
 * 若全部条件通过，则返回成功对象，否则返回 false
 *******************************************************/
async function validateConditions(conditions, Env) {
  let successfulConditions = {};

  for (const condition of conditions) {
    const key = condition.properties.key;
    const expectedValue = condition.properties.value;
    let actualValue = Env[key];

    // 若 Env 中没有此 key，直接判定不通过
    if (actualValue === undefined) {
      console.log(`Condition ${key} is required but not provided in Env.`);
      return false;
    }

    // 如果是 Neo4j Integer 对象，需要将其转换为普通 number
    if (typeof actualValue === 'object' && actualValue.low !== undefined) {
      actualValue = actualValue.low;
    }

    // 时间或日期特殊逻辑
    if (key === 'time') {
      if (!isTimeInRange(actualValue, expectedValue)) {
        console.log(`Condition failed: Time ${actualValue} not in range ${expectedValue}`);
        return false;
      }
    } else if (key === 'date') {
      if (!isDateInRange(new Date(actualValue), expectedValue)) {
        console.log(`Condition failed: Date ${actualValue} not in range ${expectedValue}`);
        return false;
      }
    } else {
      // 检查是否是比较表达式（如 >9, <100, >=18, ==42 等）
      if (isComparisonExpression(expectedValue)) {
        // 使用比较表达式验证
        if (!evaluateComparison(actualValue, expectedValue)) {
          console.log(`Condition failed: ${key} expected ${expectedValue} but got ${actualValue}`);
          return false;
        }
      } else {
        // 否则进行简单的字符串或数值相等性对比
        if (String(expectedValue).toLowerCase() !== String(actualValue).toLowerCase()) {
          console.log(`Condition failed: ${key} expected ${expectedValue} but got ${actualValue}`);
          return false;
        }
      }
    }

    // 若该条件通过，记录到 successfulConditions
    successfulConditions[key] = expectedValue;
    console.log(`Condition succeeded: ${key} expected ${expectedValue} and got ${actualValue}`);
  }

  console.log("Successful conditions:", successfulConditions);
  return successfulConditions;
}

/*******************************************************
 * 判断字符串是否是比较运算表达式的工具函数
 *******************************************************/
function isComparisonExpression(value) {
  if (typeof value !== 'string') return false;
  // 简单判断字符串是否以 <、>、=、! 开头等，也可改用更复杂的正则
  return /^(>|>=|==|<|<=|!=)\s*\d+(\.\d+)?$/.test(value.trim());
}

/*******************************************************
 * 解析并执行比较运算表达式
 * 示例：'>9'、'==100'、'<12'、'<=25'、'!=0'
 *******************************************************/
function evaluateComparison(actualValue, valueStr) {
  const trimmed = valueStr.trim();
  const regex = /^(>=|<=|==|!=|>|<)\s*(\d+(\.\d+)?)$/;
  const match = trimmed.match(regex);
  if (!match) {
    return false;
  }
  
  const operator = match[1];
  const threshold = parseFloat(match[2]);
  const numericValue = parseFloat(actualValue);

  switch (operator) {
    case '>':
      return numericValue > threshold;
    case '>=':
      return numericValue >= threshold;
    case '<':
      return numericValue < threshold;
    case '<=':
      return numericValue <= threshold;
    case '==':
      return numericValue === threshold;
    case '!=':
      return numericValue !== threshold;
    default:
      return false;
  }
}

/*******************************************************
 * 时间范围判断 - isTimeInRange
 * 格式: 'HH:mm' 范围判断，如 '09:00-18:00'
 *******************************************************/
function isTimeInRange(time, range) {
  const [start, end] = range.split('-');
  const currentTime = parseInt(time.replace(':', ''), 10);
  let [startTime, endTime] = [
    parseInt(start.replace(':', ''), 10),
    parseInt(end.replace(':', ''), 10)
  ];

  // 若结束时间小于开始时间，表示跨越午夜
  if (endTime < startTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
}

/*******************************************************
 * 日期范围判断 - isDateInRange
 * 以星期名称判断，如 'Monday-Friday' 或 'Sunday'
 *******************************************************/
function isDateInRange(currentDate, range) {
  const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysMapping = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (range.includes('-')) {
    const [startDay, endDay] = range.split('-').map(day => daysMapping.indexOf(day.trim()));
    if (startDay <= endDay) {
      return dayOfWeek >= startDay && dayOfWeek <= endDay;
    } else {
      // 跨周
      return dayOfWeek >= startDay || dayOfWeek <= endDay;
    }
  } else {
    return dayOfWeek === daysMapping.indexOf(range.trim());
  }
}

/*******************************************************
 * 记录访问日志与关系的辅助函数
 * 创建 Event 节点并与相关日志及实体建立关系
 *******************************************************/
async function createLogsAndRelations(request, Env, authorizedPolicy, isAuthorized, successfulConditions, session) {
  const { Sub, Obj, Act } = request;
  const subjectName = Sub;
  const objectName = Obj;
  const actionName = Act;

  // 构造日志名称和事件名称
  const logName = `AccessLogs_for_${subjectName}_on_${objectName}`;
  const eventName = `Event_${new Date().getTime()}`;
  const policy = authorizedPolicy;
  const requestDateTime = `${Env.date}T${Env.time}:00`;

  // 将环境上下文拼接成字符串
  const contextCondition = Object.entries(Env).map(([key, value]) => `${key}: ${value}`).join(', ');
  let successfulContextConditions = '';
  if (successfulConditions && Object.keys(successfulConditions).length > 0) {
    successfulContextConditions = Object.entries(successfulConditions)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }

  const authorizedString = isAuthorized.toString();

  try {
    // 确保 Object, Subject, AccessLogs 节点存在（MERGE）
    await session.run(
      `MERGE (obj:Object {name: $objectName})`,
      { objectName }
    );
    await session.run(
      `MERGE (sub:Subject {username: $subjectName})`,
      { subjectName }
    );
    await session.run(
      `MERGE (log:AccessLogs {name: $logName})`,
      { logName }
    );

    // 建立日志与对象以及主体与日志的关系
    await session.run(`
      MATCH (log:AccessLogs {name: $logName}), (obj:Object {name: $objectName})
      MERGE (log)-[:ABOUT]->(obj)
      `, { logName, objectName }
    );
    await session.run(`
      MATCH (sub:Subject {username: $subjectName}), (log:AccessLogs {name: $logName})
      MERGE (sub)-[:HAS_ACCESS_LOGS]->(log)
      `, { subjectName, logName }
    );

    // 创建事件节点并关联到日志
    const eventResult = await session.run(`
      MATCH (log:AccessLogs {name: $logName})
      CREATE (event:Event {
        name: $eventName,
        requestDateTime: $requestDateTime,
        authorized: $authorizedString,
        policy: $policy,
        actionName: $actionName,
        contextCondition: $contextCondition,
        successfulContextConditions: $successfulContextConditions,
        processed: "false"
      })
      CREATE (log)-[:INCLUDE]->(event)
      RETURN event
      `, {
      logName,
      eventName,
      requestDateTime,
      authorizedString,
      policy,
      actionName,
      contextCondition,
      successfulContextConditions
    });

    console.log(`Event creation result: ${JSON.stringify(eventResult.records)}`);
    console.log(`Logs and relations created successfully for ${subjectName} accessing ${objectName} with ${actionName}.`);
  } catch (error) {
    console.error('Error creating logs and relations:', error);
  }
}

/*******************************************************
 * 路由接口 - 处理前端访问请求
 * 实际上调用主授权函数 checkAuthorization 进行授权判定
 *******************************************************/
app.post('/access-request', async (req, res) => {
  const session = driver.session();
  const { Sub, Act, Obj, Env } = req.body;
  try {
    // 构造一个默认的请求对象（可根据需要定制化）
    const request = {
      Sub: Sub || "Alice",
      Act: Act || "Toggle",
      Obj: Obj || "MobileDevice",
      Env: Env || {
        date: "2024-12-26",
        time: "21:45"
        // 其他环境变量可按需添加
      }
    };

    // 执行主授权检查
    const { isAuthorized, authorizedPolicy, successfulConditions } = await checkAuthorization(request, session);

    // 访问模式异常检测
    const failurePatterns = await detectMultipleFailuresWithinShortPeriod(session, Sub, Obj);
    const repeatedAccessPatterns = await detectRepeatedAccessToSameResourceWithinShortPeriod(session, Sub, Obj);

    // 若授权通过，再记录成功日志（与旧逻辑保持一致）
    if (isAuthorized) {
      await createLogsAndRelations(request, request.Env, authorizedPolicy, isAuthorized, successfulConditions, session);
    }

    console.log(`Authorization result: ${isAuthorized}`);
    console.log(`Failure patterns:`, failurePatterns);
    console.log(`Repeated access patterns:`, repeatedAccessPatterns);

    // 将结果返回给前端
    res.json({ isAuthorized, authorizedPolicy, successfulConditions, failurePatterns, repeatedAccessPatterns });
  } catch (error) {
    console.error('Error during operation:', error);
    res.status(500).send('Server error');
  } finally {
    await session.close();
  }
});

/*******************************************************
 * 示例测试接口 - GET
 *******************************************************/
app.get('/test', (req, res) => {
  res.status(200).send({ message: 'GET 请求成功！', data: [] });
});

/*******************************************************
 * 整合 UserBehaviorDeviation.js
 * 获取访问事件中条件校验失败与无策略可匹配的事件
 *******************************************************/
app.get('/api/access-events/', async (req, res) => {
  const session = driver.session();
  try {
    const conditionValidationFailures = await findAccessEventsWithConditionValidationFailures(session);
    const noPolicyFoundEvents = await findAccessEventsWithNoPolicyFound(session);
    res.json({
      conditionValidationFailures,
      noPolicyFoundEvents
    });
  } catch (error) {
    console.error('Error retrieving access events:', error);
    res.status(500).send('Failed to retrieve access events.');
  } finally {
    await session.close();
  }
});

/*******************************************************
 * 启动服务器
 *******************************************************/
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
