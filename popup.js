document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('project-input');
  const searchBtn = document.getElementById('search-btn');
  const resultDiv = document.getElementById('result');
  const loader = document.getElementById('loader');
  const apiKeyInput = document.getElementById('api-key');
  const saveKeyBtn = document.getElementById('save-key');
  const settingsArea = document.getElementById('settings-area');
  const toggleSettings = document.getElementById('toggle-settings');

  // 1. 加载保存的 API Key
  chrome.storage.local.get(['perplexityKey'], (res) => {
    if (res.perplexityKey) {
      apiKeyInput.value = res.perplexityKey;
    } else {
      settingsArea.style.display = 'block'; // 没 Key 时自动展开设置
    }
  });

  // 2. 保存 Key
  saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      chrome.storage.local.set({ perplexityKey: key }, () => {
        alert('API Key 已保存！');
        settingsArea.style.display = 'none';
      });
    }
  });

  // 切换设置显示
  toggleSettings.addEventListener('click', () => {
    settingsArea.style.display = settingsArea.style.display === 'none' ? 'block' : 'none';
  });

  // 3. 核心查询功能
  searchBtn.addEventListener('click', async () => {
    const query = input.value.trim();
    if (!query) return;

    chrome.storage.local.get(['perplexityKey'], async (res) => {
      const apiKey = res.perplexityKey;
      if (!apiKey) {
        alert('请先点击底部设置齿轮，配置 Perplexity API Key');
        settingsArea.style.display = 'block';
        return;
      }

      // UI 状态更新
      searchBtn.disabled = true;
      loader.style.display = 'block';
      resultDiv.innerHTML = '';

      try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "sonar", // 使用联网模型
            messages: [
              {
                role: "system",
                content: "You are a crypto analyst. Search for the project. Output valid JSON ONLY with these fields: name, total_raised (e.g. '$15M' or 'Unknown'), valuation (e.g. '$100M' or 'Unknown'), top_investors (string, e.g. 'Paradigm, Coinbase'), one_line_summary (Chinese, max 20 words)."
              },
              {
                role: "user",
                content: `Project name: ${query}`
              }
            ]
          })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // 清洗 JSON 字符串 (去掉可能存在的 markdown 标记)
        const cleanJson = content.replace(/```json|```/g, "").trim();
        const info = JSON.parse(cleanJson);

        // 渲染结果
        resultDiv.innerHTML = `
          <div class="stat-row">
            <span class="label">项目</span>
            <span class="value highlight">${info.name}</span>
          </div>
          <div class="stat-row">
            <span class="label">融资额</span>
            <span class="value">${info.total_raised}</span>
          </div>
          <div class="stat-row">
            <span class="label">估值</span>
            <span class="value">${info.valuation}</span>
          </div>
          <div style="margin-top:8px; color:#cbd5e1; font-size:12px;">
            <span style="color:#94a3b8;">VC:</span> ${info.top_investors}
          </div>
          <div style="margin-top:8px; padding:8px; background:#334155; border-radius:4px; color:#fbbf24;">
            "${info.one_line_summary}"
          </div>
        `;

      } catch (err) {
        console.error(err);
        resultDiv.innerHTML = `<div style="color:#ef4444;">查询失败: ${err.message} <br>请检查 Key 或网络。</div>`;
      } finally {
        searchBtn.disabled = false;
        loader.style.display = 'none';
      }
    });
  });
});