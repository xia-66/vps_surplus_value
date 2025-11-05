/**
 * Vercel Serverless Function - 汇率API代理
 * 用于安全地调用 ExchangeRate-API，避免在前端暴露 API Key
 */

export default async function handler(req, res) {
  // 允许CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { currency = 'USD' } = req.query;
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;

    // 验证 API Key 是否配置
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      return res.status(500).json({ 
        error: 'ExchangeRate API Key 未配置',
        message: '请在 Vercel 项目设置中添加 EXCHANGE_RATE_API_KEY 环境变量'
      });
    }

    // 验证币种参数（基本校验）
    const validCurrency = /^[A-Z]{3}$/.test(currency);
    if (!validCurrency) {
      return res.status(400).json({ error: '无效的币种代码' });
    }

    // 调用 ExchangeRate-API
    const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${currency}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`ExchangeRate API returned ${response.status}`);
    }

    const data = await response.json();

    // 验证返回数据
    if (!data.conversion_rates || !data.conversion_rates.CNY) {
      throw new Error('API 返回数据格式不正确');
    }

    // 返回处理后的数据
    return res.status(200).json({
      success: true,
      currency: currency,
      rate: data.conversion_rates.CNY,
      time_last_update_utc: data.time_last_update_utc || null,
      time_next_update_utc: data.time_next_update_utc || null
    });

  } catch (error) {
    console.error('Exchange rate API error:', error);
    return res.status(500).json({ 
      error: '获取汇率失败',
      message: error.message 
    });
  }
}

