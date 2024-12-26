const neo4j = require('neo4j-driver');

async function main() {
  // 使用您的数据库连接信息替换URI、用户名和密码
  const uri = "bolt://localhost:7687";
  const user = "neo4j";
  const password = "neo4j";

  // 创建一个到Neo4j的连接
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();

  try {
    // 尝试运行一个简单的Cypher查询
    const result = await session.run('MATCH (n) RETURN n LIMIT 5');

    // 输出查询结果
    result.records.forEach(record => {
      console.log(record.get('n'));
    });
  } catch (error) {
    console.error('Something went wrong:', error);
  } finally {
    // 关闭session和driver
    await session.close();
    await driver.close();
  }
}

main();
