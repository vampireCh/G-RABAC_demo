const neo4j = require('neo4j-driver');

async function updateRiskScore(session, subjectName, riskScoreIncrement) {
    try {
        const updateResult = await session.run(`
            MATCH (sub:Subject {username: $subjectName})
            SET sub.riskScore = coalesce(sub.riskScore, 0) + $riskScoreIncrement
            RETURN sub.name AS subjectName, sub.riskScore AS newRiskScore
        `, { subjectName, riskScoreIncrement });
        const updatedSubject = updateResult.records[0].toObject();
        console.log(`Updated risk score for ${updatedSubject.subjectName}: ${updatedSubject.newRiskScore}`);
    } catch (error) {
        console.error(`Error updating risk score for ${subjectName}:`, error);
    }
}

//duration时间下频繁访问失败，在每次访问的时候触发
async function detectMultipleFailuresWithinShortPeriod(session, subjectName, objectName) {
    const currentTime = new Date().getTime();
    const offset = 8 * 60 * 60 * 1000; // UTC+8小时转换为毫秒
    const beijingTime = new Date(currentTime + offset);
    const duration = 1800000; // 30分钟
    const baseRiskScoreIncrement = 1; // 每次失败增加1分风险评分

    const startTime = new Date(beijingTime - duration).toISOString();
    console.log(`Start checking time is greater than ${startTime} (BeijingTime)`);

    try {
        const failuresResult = await session.run(`
            MATCH (sub:Subject {name: $subjectName})-[:HAS_ACCESS_LOGS]->(log:AccessLogs)-[:ABOUT]->(obj:Object {name: $objectName}),
                  (log)-[:INCLUDE]->(event:Event)
            WHERE event.authorized = "false" AND event.requestDateTime >= $startTime
            RETURN event.requestDateTime AS failureTime
            ORDER BY event.requestDateTime DESC
        `, { subjectName, objectName, startTime });
        const failuresTimes = failuresResult.records.map(record => record.get('failureTime'));

        if (failuresTimes.length > 0) {
            const totalRiskScoreIncrement = baseRiskScoreIncrement * failuresTimes.length;
            await updateRiskScore(session, subjectName, totalRiskScoreIncrement);
            console.log(`Detected ${failuresTimes.length} failures. Total risk score increment: ${totalRiskScoreIncrement}`);
            return failuresTimes;
        } else {
            console.log(`No pattern of multiple failures detected for ${subjectName} on ${objectName}.`);
            return [];
        }
    } catch (error) {
        console.error(`Error detecting multiple failures within short period for ${subjectName} on ${objectName}:`, error);
        return [];
    }
}

//短时间内频繁访问同一个对象
async function detectRepeatedAccessToSameResourceWithinShortPeriod(session, subjectName, objectName) {
    const currentTime = new Date().getTime();
    const offset = 8 * 60 * 60 * 1000; // UTC+8小时转换为毫秒
    const beijingTime = new Date(currentTime + offset);
    const duration = 600000; // 10分钟
    const baseRiskScoreIncrement = 2; // 每次检测到重复访问增加2分风险评分

    const startTime = new Date(beijingTime.getTime() - duration).toISOString();
    console.log(`Start checking time is greater than ${startTime} (BeijingTime)`);

    try {
        const query = `
            MATCH (sub:Subject {name: $subjectName})-[:HAS_ACCESS_LOGS]->(log:AccessLogs)-[:ABOUT]->(obj:Object {name: $objectName}),
                  (log)-[:INCLUDE]->(event:Event)
            WHERE event.requestDateTime >= $startTime
            RETURN event.requestDateTime AS accessTime
            ORDER BY event.requestDateTime DESC
        `;
        const result = await session.run(query, { subjectName, objectName, startTime });
        const accessTimes = result.records.map(record => record.get('accessTime'));

        let repeatedAccessPatterns = [];
        for (let i = 0; i < accessTimes.length - 1; i++) {
            const currentAccessTime = new Date(accessTimes[i]);
            const nextAccessTime = new Date(accessTimes[i + 1]);
            if (currentAccessTime - nextAccessTime <= duration) {
                repeatedAccessPatterns.push({ firstAccess: accessTimes[i + 1], secondAccess: accessTimes[i] });
                i++; // Skip the next record since it's part of the current pattern
            }
        }

        if (repeatedAccessPatterns.length >= 3) {
            const totalRiskScoreIncrement = baseRiskScoreIncrement * repeatedAccessPatterns.length;
            await updateRiskScore(session, subjectName, totalRiskScoreIncrement);
            console.log(`Detected repeated access patterns. Total risk score increment: ${totalRiskScoreIncrement}`);
            return repeatedAccessPatterns;
        } else {
            console.log(`No pattern of repeated accesses detected for ${subjectName} on ${objectName}.`);
            return [];
        }
    } catch (error) {
        console.error(`Error detecting repeated accesses within short period for ${subjectName} on ${objectName}:`, error);
        return [];
    }
}

module.exports = {
    detectMultipleFailuresWithinShortPeriod,
    detectRepeatedAccessToSameResourceWithinShortPeriod
};
