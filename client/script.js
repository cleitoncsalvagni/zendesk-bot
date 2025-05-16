document.addEventListener("DOMContentLoaded", () => {
  const chatMessages = document.getElementById("chatMessages");
  const userInput = document.getElementById("userInput");
  const sendButton = document.getElementById("sendButton");
  const themeToggle = document.getElementById("themeToggle");

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });

  function addMessage(message, isUser = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isUser ? "user" : "bot"}`;

    if (!isUser) {
      const avatar = document.createElement("img");
      avatar.className = "message-avatar";
      avatar.src =
        "https://appbarber-appbeleza.zendesk.com/hc/theming_assets/01HZH2QA4G017E0E8WBN8MK0MX";
      avatar.alt = "Bot Avatar";
      messageDiv.appendChild(avatar);
    }

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "message-content-wrapper";

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    if (!isUser) {
      messageContent.innerHTML = marked.parse(message);
    } else {
      messageContent.textContent = message;
    }

    contentWrapper.appendChild(messageContent);
    messageDiv.appendChild(contentWrapper);
    chatMessages.appendChild(messageDiv);

    setTimeout(() => {
      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  }

  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    userInput.disabled = true;
    sendButton.disabled = true;

    const originalPlaceholder = userInput.placeholder;
    userInput.placeholder = "Processando sua pergunta...";

    addMessage(message, true);
    userInput.value = "";

    const loadingMessage = document.createElement("div");
    loadingMessage.className = "message bot";
    loadingMessage.innerHTML = `
      <img class="message-avatar" src="https://appbarber-appbeleza.zendesk.com/hc/theming_assets/01HZH2QA4G017E0E8WBN8MK0MX" alt="Bot Avatar">
      <div class="message-content-wrapper">
        <div class="message-content">
          <div class="typing-indicator">
            <div class="typing-indicator-bubble">
              <div class="typing-indicator-dot"></div>
              <div class="typing-indicator-dot"></div>
              <div class="typing-indicator-dot"></div>
            </div>
            <div class="typing-indicator-text">Processando sua pergunta...</div>
          </div>
        </div>
      </div>
    `;
    chatMessages.appendChild(loadingMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const response = await fetch(
        "http://localhost:3000/api/articles/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: message }),
        }
      );

      if (!response.ok) {
        throw new Error("Erro na resposta do servidor");
      }

      const data = await response.json();
      chatMessages.removeChild(chatMessages.lastElementChild);

      if (data.success && Array.isArray(data.data)) {
        if (data.data.length === 0) {
          addMessage(
            "😕 Desculpe, não encontrei nenhum artigo relevante para sua pergunta. Por favor, tente reformular sua pergunta."
          );
          return;
        }

        let responseText = "📚 Encontrei os seguintes artigos relevantes:\n\n";

        data.data.forEach((article, index) => {
          responseText += `${index + 1}. **${article.title}**\n`;
          responseText += `${article.body.substring(0, 200)}... `;
          responseText += `<a href="${article.link}" target="_blank">Ver artigo completo</a>\n\n`;
        });

        addMessage(responseText);
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (error) {
      console.error("Erro:", error);
      if (chatMessages.lastElementChild?.querySelector(".typing-indicator")) {
        chatMessages.removeChild(chatMessages.lastElementChild);
      }

      addMessage(
        "😕 Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde ou reformule sua pergunta."
      );
    } finally {
      userInput.disabled = false;
      sendButton.disabled = false;
      userInput.placeholder = originalPlaceholder;
    }
  }

  sendButton.addEventListener("click", sendMessage);

  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  userInput.focus();
});
