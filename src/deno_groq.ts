const getContentType = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const types: Record<string, string> = {
    'js': 'application/javascript',
    'css': 'text/css',
    'html': 'text/html',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif'
  };
  return types[ext] || 'text/plain';
};

async function handleAPIRequest(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    // 替换为 Groq 的 API 地址
    const groqApiUrl = `https://api.groq.com${url.pathname}${url.search}`;
    
    // 克隆请求头并添加必要的认证（如 API Key）
    const headers = new Headers(req.headers);
    headers.set("Authorization", `Bearer ${Deno.env.get("GROQ_API_KEY")}`); // 从环境变量获取
    
    // 转发请求到 Groq API
    const response = await fetch(groqApiUrl, {
      method: req.method,
      headers,
      body: req.body,
    });
    
    // 返回 Groq 的响应
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error('API request error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStatus = (error as { status?: number }).status || 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: errorStatus,
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      }
    });
  }
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log('Request URL:', req.url);

  // 处理 API 请求（代理到 Groq）
  if (
    url.pathname.startsWith("/v1/chat/completions") || // Groq 的聊天端点
    url.pathname.startsWith("/openai/v1/chat/completions") || // 兼容 OpenAI 格式
    url.pathname.startsWith("/v1/models") // 模型列表
  ) {
    return handleAPIRequest(req);
  }

  // 静态文件处理
  try {
    let filePath = url.pathname;
    if (filePath === '/' || filePath === '/index.html') {
      filePath = '/index.html';
    }

    const fullPath = `${Deno.cwd()}/src/static${filePath}`;
    const file = await Deno.readFile(fullPath);
    const contentType = getContentType(filePath);

    return new Response(file, {
      headers: {
        'content-type': `${contentType};charset=UTF-8`,
      },
    });
  } catch (e) {
    console.error('Static file error:', e);
    return new Response('Not Found', { 
      status: 404,
      headers: {
        'content-type': 'text/plain;charset=UTF-8',
      }
    });
  }
}

// 启动服务器（从环境变量读取 Groq API Key）
Deno.serve({
  port: 8000,
  onListen: () => console.log("Server running on http://localhost:8000"),
}, handleRequest);
