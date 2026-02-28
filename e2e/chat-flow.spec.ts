import { test, expect } from "@playwright/test";

test.describe("Chat Flow", () => {
  test("navigates from landing to chat page", async ({ page }) => {
    await page.goto("/");
    // Landing page performs a client-side redirect to /chat
    await expect(page).toHaveURL(/\/chat/);
  });

  test("settings page loads and shows provider config", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Settings heading is visible
    await expect(
      page.locator("h1", { hasText: "Settings" })
    ).toBeVisible();

    // Subheading copy is present
    await expect(
      page.locator("text=Configure your AI provider")
    ).toBeVisible();

    // Provider buttons are rendered (Anthropic, OpenAI, Google, Ollama)
    for (const provider of ["Anthropic", "OpenAI", "Google", "Ollama"]) {
      await expect(
        page.locator("button", { hasText: provider })
      ).toBeVisible();
    }

    // Model label is visible
    await expect(page.locator("text=Model")).toBeVisible();

    // PineScript Version section with V5 / V6 toggle
    await expect(
      page.locator("text=PineScript Version")
    ).toBeVisible();
    await expect(page.locator("button", { hasText: "V5" })).toBeVisible();
    await expect(page.locator("button", { hasText: "V6" })).toBeVisible();

    // Action buttons
    await expect(
      page.locator("button", { hasText: "Test Connection" })
    ).toBeVisible();
    // The save button renders with an HTML entity arrow; match the visible text
    await expect(
      page.locator("button", { hasText: /Save.*Continue/ })
    ).toBeVisible();
  });

  test("settings page allows switching providers", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Default provider is Anthropic; the API Key label should be shown
    await expect(page.locator("label", { hasText: "API Key" })).toBeVisible();

    // Switch to Ollama
    await page.locator("button", { hasText: "Ollama" }).click();

    // Now the label should change to Ollama URL
    await expect(
      page.locator("label", { hasText: "Ollama URL" })
    ).toBeVisible();

    // The input should show the default placeholder
    const ollamaInput = page.locator('input[placeholder="http://localhost:11434"]');
    await expect(ollamaInput).toBeVisible();

    // Switch to OpenAI
    await page.locator("button", { hasText: "OpenAI" }).click();

    // API Key label returns and placeholder changes
    await expect(page.locator("label", { hasText: "API Key" })).toBeVisible();
    await expect(page.locator('input[placeholder="sk-..."]')).toBeVisible();
  });

  test("chat page shows onboarding when no settings exist", async ({
    page,
  }) => {
    // Clear localStorage to ensure no settings
    await page.goto("/chat");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");

    // OnboardingGate should render with "Get started" heading
    await expect(
      page.locator("h1", { hasText: "Get started" })
    ).toBeVisible();

    // Provider selector buttons
    await expect(
      page.locator("button", { hasText: "Anthropic" })
    ).toBeVisible();
    await expect(
      page.locator("button", { hasText: "OpenAI" })
    ).toBeVisible();

    // Save button should be disabled (no key entered)
    const saveBtn = page.locator("button", { hasText: /Save.*Start/ });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeDisabled();
  });

  test("chat page shows empty state after configuring settings", async ({
    page,
  }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Inject valid settings into localStorage so the chat empty state renders
    await page.evaluate(() => {
      localStorage.setItem(
        "pinescript-ai-settings",
        JSON.stringify({
          provider: "anthropic",
          apiKey: "sk-ant-test-key",
          model: "claude-sonnet-4-6",
          ollamaUrl: "http://localhost:11434",
          pineVersion: "v6",
          transpilerEnabled: false,
        })
      );
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Empty state heading
    await expect(
      page.locator("h1", { hasText: "PineScript AI" })
    ).toBeVisible();

    // Subheading copy
    await expect(
      page.locator("text=Describe an indicator or strategy")
    ).toBeVisible();

    // Action buttons from the empty state
    await expect(
      page.locator("button", { hasText: "Browse Examples" })
    ).toBeVisible();
    await expect(
      page.locator("button", { hasText: "Brainstorm" })
    ).toBeVisible();

    // Chat input textarea is present and focusable
    const textarea = page.locator(
      'textarea[placeholder="Describe the PineScript indicator you want..."]'
    );
    await expect(textarea).toBeVisible();
    await textarea.focus();
    await expect(textarea).toBeFocused();

    // Disclaimer text
    await expect(
      page.locator("text=AI-generated code may contain errors")
    ).toBeVisible();
  });

  test("chat input accepts text and shows enabled send button", async ({
    page,
  }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Set up valid settings so the chat input renders
    await page.evaluate(() => {
      localStorage.setItem(
        "pinescript-ai-settings",
        JSON.stringify({
          provider: "anthropic",
          apiKey: "sk-ant-test-key",
          model: "claude-sonnet-4-6",
          ollamaUrl: "http://localhost:11434",
          pineVersion: "v6",
        })
      );
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const textarea = page.locator(
      'textarea[placeholder="Describe the PineScript indicator you want..."]'
    );

    // Send button should be disabled when input is empty
    // The send button is a round button containing an ArrowUp SVG
    const sendButton = page.locator("button.rounded-full");
    await expect(sendButton).toBeDisabled();

    // Type a message
    await textarea.fill("Create a simple RSI indicator");
    await expect(textarea).toHaveValue("Create a simple RSI indicator");

    // Send button should now be enabled
    await expect(sendButton).toBeEnabled();

    // Clear the input — button should go back to disabled
    await textarea.fill("");
    await expect(sendButton).toBeDisabled();
  });

  test("shows error when sending message with fake API key", async ({
    page,
  }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Set up settings with a fake API key
    await page.evaluate(() => {
      localStorage.setItem(
        "pinescript-ai-settings",
        JSON.stringify({
          provider: "anthropic",
          apiKey: "sk-ant-fake-key-for-testing",
          model: "claude-sonnet-4-6",
          ollamaUrl: "http://localhost:11434",
          pineVersion: "v6",
        })
      );
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const textarea = page.locator(
      'textarea[placeholder="Describe the PineScript indicator you want..."]'
    );

    // Type and send a message via Enter key
    await textarea.fill("Create a simple RSI indicator");
    await textarea.press("Enter");

    // The user message should appear in the chat
    await expect(page.locator("text=Create a simple RSI indicator")).toBeVisible();

    // Since the API key is fake the request should fail; wait for an error to appear.
    // The error banner has a specific class pattern with accent-error.
    const errorBanner = page.locator('[class*="accent-error"]');
    await expect(errorBanner.first()).toBeVisible({ timeout: 15000 });
  });

  test("settings page saves config and redirects to chat", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Select OpenAI provider
    await page.locator("button", { hasText: "OpenAI" }).click();

    // Fill in API key
    const apiKeyInput = page.locator('input[placeholder="sk-..."]');
    await apiKeyInput.fill("sk-test-fake-key-12345");

    // Ensure a model is selected (first model button should be active by default)
    // Save & Continue button should be enabled now
    const saveBtn = page.locator("button", { hasText: /Save.*Continue/ });
    await expect(saveBtn).toBeEnabled();

    // Click save — it should store to localStorage and redirect to /chat
    await saveBtn.click();
    await expect(page).toHaveURL(/\/chat/);

    // Verify settings were persisted
    const storedSettings = await page.evaluate(() =>
      localStorage.getItem("pinescript-ai-settings")
    );
    expect(storedSettings).toBeTruthy();

    const parsed = JSON.parse(storedSettings!);
    expect(parsed.provider).toBe("openai");
    expect(parsed.apiKey).toBe("sk-test-fake-key-12345");
  });

  test("onboarding gate saves settings and reveals chat UI", async ({
    page,
  }) => {
    // Start fresh — no settings
    await page.goto("/chat");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Onboarding is shown
    await expect(
      page.locator("h1", { hasText: "Get started" })
    ).toBeVisible();

    // Select Ollama provider (no API key needed, just URL + model)
    await page.locator("button", { hasText: "Ollama" }).click();

    // Ollama URL input should have default value
    const urlInput = page.locator('input[placeholder="http://localhost:11434"]');
    await expect(urlInput).toBeVisible();

    // Fill in a model name
    const modelInput = page.locator(
      'input[placeholder="codellama, deepseek-coder, etc."]'
    );
    await modelInput.fill("codellama");

    // Save button should be enabled
    const saveBtn = page.locator("button", { hasText: /Save.*Start/ });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // After saving, onboarding should disappear and the chat empty state should appear
    await expect(
      page.locator("h1", { hasText: "PineScript AI" })
    ).toBeVisible({ timeout: 5000 });

    // The chat textarea should now be present
    await expect(
      page.locator(
        'textarea[placeholder="Describe the PineScript indicator you want..."]'
      )
    ).toBeVisible();
  });
});
