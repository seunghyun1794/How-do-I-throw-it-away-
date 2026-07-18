module.exports = (req, res) => {
  const key = process.env.GEMMA_API_KEY || '';
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.send(`window.ENV = { GEMMA_API_KEY: ${JSON.stringify(key)} };`);
};
