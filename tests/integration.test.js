/**
 * WebClaw 独立版 - 集成测试
 * 测试完整的工作流程
 */

import { test, expect } from 'playwright/test';

test.describe('WebClaw Standalone', () => {
  test('浏览器管理器可以启动和关闭', async ({ browser }) => {
    const { BrowserManager } = await import('../src/browser/browser-manager.js');
    
    const manager = new BrowserManager({ headless: true });
    await manager.launch();
    
    expect(manager.state).toBe('ready');
    expect(manager.page).toBeTruthy();
    
    await manager.close();
    expect(manager.state).toBe('idle');
  });

  test('可以导航到网站并获取标题', async ({ browser }) => {
    const { BrowserManager } = await import('../src/browser/browser-manager.js');
    
    const manager = new BrowserManager({ headless: true });
    await manager.launch();
    
    const result = await manager.navigate('https://example.com');
    
    expect(result.success).toBe(true);
    expect(result.title).toContain('Example');
    expect(manager.page.url()).toContain('example.com');
    
    await manager.close();
  });

  test('页面分析返回正确的结构', async ({ browser }) => {
    const { BrowserManager } = await import('../src/browser/browser-manager.js');
    
    const manager = new BrowserManager({ headless: true });
    await manager.launch();
    await manager.navigate('https://example.com');
    
    const analysis = await manager.analyze();
    
    expect(analysis.success).toBe(true);
    expect(analysis.url).toBeTruthy();
    expect(analysis.title).toBeTruthy();
    expect(Array.isArray(analysis.interactiveElements)).toBe(true);
    
    await manager.close();
  });

  test('NLP 引擎在没有 token 时返回错误', async () => {
    const { NLPEngine } = await import('../src/nlp/nlp-engine.js');
    
    const nlp = new NLPEngine({ apiToken: '' });
    await nlp.initialize();
    
    const result = await nlp.processInput('点击登录');
    
    expect(result.success).toBe(false);
    expect(result.code).toBe('NO_API_TOKEN');
  });

  test('Agent 可以创建和初始化', async () => {
    const { Agent } = await import('../src/core/agent.js');
    
    const agent = new Agent({ headless: true });
    await agent.initialize();
    
    expect(agent.state).toBe('ready');
    expect(agent.browser).toBeTruthy();
    expect(agent.nlp).toBeTruthy();
    expect(agent.services).toBeTruthy();
    
    await agent.close();
  });

  test('服务注册表包含所有内置服务', async () => {
    const { ServiceRegistry } = await import('../src/services/registry.js');
    
    const registry = new ServiceRegistry();
    await registry.initialize();
    
    const services = registry.getAllServices();
    
    expect(services).toContain('click');
    expect(services).toContain('fill');
    expect(services).toContain('scroll');
    expect(services).toContain('navigate');
    expect(services).toContain('search');
    expect(services).toContain('analyze');
    expect(services).toContain('screenshot');
  });
});
