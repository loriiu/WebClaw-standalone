import { chromium } from 'playwright';

console.log('1. 开始测试');

try {
  console.log('2. 启动浏览器...');
  const browser = await chromium.launch({ 
    headless: true,
    timeout: 10000
  });
  console.log('3. 浏览器已启动');
  
  const page = await browser.newPage();
  console.log('4. 页面已创建');
  
  await page.goto('https://example.com', { timeout: 10000 });
  console.log('5. 导航成功，标题:', await page.title());
  
  await browser.close();
  console.log('6. 测试完成');
} catch (e) {
  console.error('错误:', e.message);
}
