const neo4j = require('neo4j-driver');

// 查找不满足条件的访问事件
async function findAccessEventsWithConditionValidationFailures(session) {
  const query = `
  MATCH (sub:Subject)-[:HAS_ACCESS_LOGS]->(log:AccessLogs)-[:ABOUT]->(obj:Object),
  (log)-[:INCLUDE]->(event:Event)
  WHERE event.authorized = "false" AND event.policy = "Contextualconditionvalidationfailed" AND event.processed = "false"
  SET event.processed = "true"
  WITH sub, obj, collect(event) AS events
  SET sub.riskScore = coalesce(sub.riskScore, 0) + size(events)
  RETURN sub.username AS subjectName, obj.name AS objectName, events[0].requestDateTime AS requestDateTime, 
         events[0].policy AS failureReason, sub.riskScore AS newRiskScore
  ORDER BY requestDateTime DESC`;
  try {
    const result = await session.run(query);
    const failures = result.records.map(record => ({ ...record.toObject() }));
    console.log("不满足条件的访问事件及风险评分更新：", failures);
    return failures;
  } catch (error) {
    console.error('Error finding access events with condition validation failures:', error);
    return [];
  }
}

// 查找执行不符合角色的访问事件
async function findAccessEventsWithNoPolicyFound(session) {
  const query = `
  MATCH (sub:Subject)-[:HAS_ACCESS_LOGS]->(log:AccessLogs)-[:ABOUT]->(obj:Object),
  (log)-[:INCLUDE]->(event:Event)
  WHERE event.authorized = "false" AND event.policy = "Nopolicyfound" AND event.processed = "false"
  SET event.processed = "true"
  WITH sub, obj, collect(event) AS events
  SET sub.riskScore = coalesce(sub.riskScore, 0) + size(events)
  RETURN sub.username AS subjectName, obj.name AS objectName, events[0].requestDateTime AS requestDateTime, 
         events[0].policy AS failureReason, sub.riskScore AS newRiskScore
  ORDER BY requestDateTime DESC`;
  try {
    const result = await session.run(query);
    const failures = result.records.map(record => ({ ...record.toObject() }));
    console.log("执行不符合角色的访问事件及风险评分更新：", failures);
    return failures;
  } catch (error) {
    console.error('Error finding access events with no policy found:', error);
    return [];
  }
}

module.exports = {
  findAccessEventsWithConditionValidationFailures,
  findAccessEventsWithNoPolicyFound
};
